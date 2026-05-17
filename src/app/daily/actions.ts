"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { parseLocalDate, startOfDay, TOPIC_STATUSES } from "@/lib/utils";
import { requireRole } from "@/lib/session";
import { validateDailyRitual } from "@/lib/dailyRitual";

// Status ladder derived from the single source of truth so we don't drift
// when a new milestone is added on /subjects.
const STATUS_RANK: Record<string, number> = Object.fromEntries(
  TOPIC_STATUSES.map((s, i) => [s.value, i]),
);
const SELF_STUDIED_RANK = STATUS_RANK.self_studied ?? 2;

/**
 * Bump every topic touched in a daily log to at least "self_studied".
 * Batched so one log save = one read + one write instead of N + N.
 */
async function bumpTopicsToSelfStudied(topicIds: string[]) {
  const unique = Array.from(new Set(topicIds.filter(Boolean)));
  if (unique.length === 0) return;
  const topics = await prisma.topic.findMany({
    where: { id: { in: unique } },
    select: { id: true, status: true },
  });
  const toBump = topics
    .filter((t) => (STATUS_RANK[t.status] ?? 0) < SELF_STUDIED_RANK)
    .map((t) => t.id);
  if (toBump.length === 0) return;
  await prisma.topic.updateMany({
    where: { id: { in: toBump } },
    data: { status: "self_studied" },
  });
}

export async function upsertDailyLog(formData: FormData) {
  await requireRole(["student", "admin"]);

  const dateStr = formData.get("date") as string;
  const date = startOfDay(parseLocalDate(dateStr));
  const schoolHours = Number(formData.get("schoolHours") || 0);
  const coachingHours = Number(formData.get("coachingHours") || 0);
  const selfStudyHours = Number(formData.get("selfStudyHours") || 0);
  const notes = ((formData.get("notes") as string) || "").trim() || null;
  const sleepRaw = formData.get("sleepHours");
  const sleepHours =
    sleepRaw == null || sleepRaw === "" ? null : Number(sleepRaw);
  const energyRaw = formData.get("energy");
  const energy =
    energyRaw == null || energyRaw === "" ? null : Number(energyRaw);

  const reflection = {
    learned: ((formData.get("ref_learned") as string) || "").trim() || null,
    confused: ((formData.get("ref_confused") as string) || "").trim() || null,
    hardestSolved:
      ((formData.get("ref_hardest") as string) || "").trim() || null,
  };
  const hasReflection =
    reflection.learned || reflection.confused || reflection.hardestSolved;

  const entries: Array<{
    subjectId: string;
    chapterId: string | null;
    topicId: string | null;
    source: string;
    subTopic: string | null;
    problemsSolved: number;
    homeworkDone: boolean;
    notes: string | null;
  }> = [];

  for (let i = 0; i < 30; i++) {
    const subjectId = formData.get(`entry_${i}_subjectId`) as string | null;
    if (!subjectId) continue;
    const chapterId =
      ((formData.get(`entry_${i}_chapterId`) as string | null) || "").trim() ||
      null;
    const topicIdRaw =
      ((formData.get(`entry_${i}_topicId`) as string | null) || "").trim() ||
      null;
    const topicId =
      topicIdRaw && topicIdRaw !== "__other__" ? topicIdRaw : null;
    let subTopic =
      ((formData.get(`entry_${i}_subTopic`) as string | null) || "").trim() ||
      null;
    if (!chapterId && !subTopic && !topicId) continue;

    entries.push({
      subjectId,
      chapterId,
      topicId,
      source: (formData.get(`entry_${i}_source`) as string) || "self",
      subTopic, // may be null when only topicId is set; back-filled below
      problemsSolved: Number(formData.get(`entry_${i}_problems`) || 0),
      homeworkDone: formData.get(`entry_${i}_hwDone`) === "on",
      notes: ((formData.get(`entry_${i}_notes`) as string) || "").trim() || null,
    });
  }

  // Back-fill subTopic names for any rows where the user picked a topic from
  // the dropdown but no free-text subTopic. One findMany instead of N.
  const topicIdsNeedingNames = entries
    .filter((e) => e.topicId && !e.subTopic)
    .map((e) => e.topicId as string);
  if (topicIdsNeedingNames.length > 0) {
    const topics = await prisma.topic.findMany({
      where: { id: { in: topicIdsNeedingNames } },
      select: { id: true, name: true },
    });
    const nameById = new Map(topics.map((t) => [t.id, t.name]));
    for (const e of entries) {
      if (e.topicId && !e.subTopic) {
        e.subTopic = nameById.get(e.topicId) ?? null;
      }
    }
  }

  const existingPhotos = await prisma.photo.count({
    where: { dailyLog: { date } },
  });
  const pendingPhotos = Number(formData.get("pendingPhotoCount") || 0);
  const ritualErr = validateDailyRitual(
    entries.map((e) => ({
      chapterId: e.chapterId,
      topicId: e.topicId,
      subTopic: e.subTopic,
    })),
    existingPhotos + pendingPhotos
  );
  if (ritualErr) {
    throw new Error(ritualErr);
  }

  const log = await prisma.dailyLog.upsert({
    where: { date },
    update: {
      schoolHours,
      coachingHours,
      selfStudyHours,
      sleepHours,
      energy,
      notes,
      entries: { deleteMany: {} },
    },
    create: {
      date,
      schoolHours,
      coachingHours,
      selfStudyHours,
      sleepHours,
      energy,
      notes,
    },
  });

  if (entries.length) {
    await prisma.dailyEntry.createMany({
      data: entries.map((e) => ({ ...e, dailyLogId: log.id })),
    });
    await bumpTopicsToSelfStudied(
      entries.map((e) => e.topicId).filter((id): id is string => !!id),
    );
  }

  if (hasReflection) {
    await prisma.dailyReflection.upsert({
      where: { dailyLogId: log.id },
      update: reflection,
      create: { dailyLogId: log.id, ...reflection },
    });
  } else {
    await prisma.dailyReflection.deleteMany({ where: { dailyLogId: log.id } });
  }

  revalidatePath("/daily");
  revalidatePath("/");
  revalidatePath("/subjects");
  revalidatePath(`/daily/new?date=${dateStr}`);
  return { id: log.id };
}

export async function deleteDailyLog(id: string) {
  await requireRole(["admin"]);
  await prisma.dailyLog.delete({ where: { id } });
  revalidatePath("/daily");
  revalidatePath("/");
}
