"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { parseLocalDate, startOfDay } from "@/lib/utils";

export async function upsertDailyLog(formData: FormData) {
  const dateStr = formData.get("date") as string;
  const date = startOfDay(parseLocalDate(dateStr));
  const schoolHours = Number(formData.get("schoolHours") || 0);
  const coachingHours = Number(formData.get("coachingHours") || 0);
  const selfStudyHours = Number(formData.get("selfStudyHours") || 0);
  const notes = ((formData.get("notes") as string) || "").trim() || null;

  const entries: Array<{
    subjectId: string;
    chapterId: string | null;
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
    const subTopic =
      ((formData.get(`entry_${i}_subTopic`) as string | null) || "").trim() ||
      null;
    if (!chapterId && !subTopic) continue; // skip empty rows
    entries.push({
      subjectId,
      chapterId,
      source: (formData.get(`entry_${i}_source`) as string) || "self",
      subTopic,
      problemsSolved: Number(formData.get(`entry_${i}_problems`) || 0),
      homeworkDone: formData.get(`entry_${i}_hwDone`) === "on",
      notes: ((formData.get(`entry_${i}_notes`) as string) || "").trim() || null,
    });
  }

  const log = await prisma.dailyLog.upsert({
    where: { date },
    update: {
      schoolHours,
      coachingHours,
      selfStudyHours,
      notes,
      entries: { deleteMany: {} },
    },
    create: {
      date,
      schoolHours,
      coachingHours,
      selfStudyHours,
      notes,
    },
  });

  if (entries.length) {
    await prisma.dailyEntry.createMany({
      data: entries.map((e) => ({ ...e, dailyLogId: log.id })),
    });
  }

  revalidatePath("/daily");
  revalidatePath("/");
}

export async function deleteDailyLog(id: string) {
  await prisma.dailyLog.delete({ where: { id } });
  revalidatePath("/daily");
  revalidatePath("/");
}
