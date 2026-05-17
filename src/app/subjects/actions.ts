"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { TOPIC_STATUSES } from "@/lib/utils";

const VALID_STATUSES: Set<string> = new Set(TOPIC_STATUSES.map((s) => s.value));

function clamp(n: unknown, lo: number, hi: number): number | undefined {
  if (n == null) return undefined;
  const x = Number(n);
  if (!Number.isFinite(x)) return undefined;
  return Math.min(hi, Math.max(lo, Math.floor(x)));
}

export async function updateTopic(
  id: string,
  data: {
    status?: string;
    confidence?: number;
    problemsSolved?: number;
    notes?: string | null;
  }
) {
  await requireRole(["student", "admin"]);

  // Validate + coerce — silently drop fields that don't fit the schema instead
  // of letting bad data poison charts/rules downstream.
  const patch: {
    status?: string;
    confidence?: number;
    problemsSolved?: number;
    notes?: string | null;
    lastRevisedAt?: Date | null;
  } = {};
  if (data.status !== undefined) {
    if (!VALID_STATUSES.has(data.status)) {
      throw new Error(`Invalid topic status "${data.status}".`);
    }
    patch.status = data.status;
    if (["revised", "mastered", "problems_done"].includes(data.status)) {
      patch.lastRevisedAt = new Date();
    }
  }
  const c = clamp(data.confidence, 0, 5);
  if (c !== undefined) patch.confidence = c;
  const p = clamp(data.problemsSolved, 0, 100_000);
  if (p !== undefined) patch.problemsSolved = p;
  if (data.notes !== undefined) {
    const trimmed = (data.notes ?? "").toString().trim();
    patch.notes = trimmed.length === 0 ? null : trimmed.slice(0, 2000);
  }

  if (Object.keys(patch).length === 0) return;

  await prisma.topic.update({ where: { id }, data: patch });
  revalidatePath("/subjects");
  revalidatePath("/");
}

export async function createTopic(chapterId: string, name: string) {
  await requireRole(["student", "admin"]);
  const trimmed = name.trim();
  if (!trimmed) return;
  const dup = await prisma.topic.findFirst({
    where: { chapterId, name: trimmed },
  });
  if (dup) return; // silently ignore duplicates
  await prisma.topic.create({
    data: { chapterId, name: trimmed },
  });
  revalidatePath("/subjects");
  revalidatePath("/");
}

export async function createChapter(
  subjectId: string,
  name: string
): Promise<{ id: string; name: string } | null> {
  await requireRole(["student", "admin"]);
  const trimmed = name.trim();
  if (!trimmed) return null;

  const dup = await prisma.chapter.findFirst({
    where: { subjectId, name: trimmed },
  });
  if (dup) return { id: dup.id, name: dup.name };

  const lastChapter = await prisma.chapter.aggregate({
    where: { subjectId },
    _max: { order: true },
  });

  const created = await prisma.chapter.create({
    data: {
      subjectId,
      name: trimmed,
      order: (lastChapter._max.order ?? 0) + 1,
    },
  });

  revalidatePath("/subjects");
  revalidatePath("/daily/new");
  revalidatePath("/tests/upcoming/new");
  revalidatePath("/");

  return { id: created.id, name: created.name };
}

export async function deleteChapter(id: string) {
  await requireRole(["admin"]);
  // Preserve historical daily entries by clearing the chapter ref before delete.
  // Topics cascade-delete via the Prisma schema relation.
  await prisma.dailyEntry.updateMany({
    where: { chapterId: id },
    data: { chapterId: null },
  });
  await prisma.chapter.delete({ where: { id } });
  revalidatePath("/subjects");
  revalidatePath("/daily");
  revalidatePath("/daily/new");
  revalidatePath("/tests/upcoming/new");
  revalidatePath("/");
}

export async function deleteTopic(id: string) {
  await requireRole(["admin"]);
  await prisma.topic.delete({ where: { id } });
  revalidatePath("/subjects");
  revalidatePath("/");
}
