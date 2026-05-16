"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateTopic(
  id: string,
  data: {
    status?: string;
    confidence?: number;
    problemsSolved?: number;
    notes?: string | null;
  }
) {
  const patch: typeof data & { lastRevisedAt?: Date | null } = { ...data };
  if (
    data.status &&
    ["revised", "mastered", "problems_done"].includes(data.status)
  ) {
    patch.lastRevisedAt = new Date();
  }
  await prisma.topic.update({ where: { id }, data: patch });
  revalidatePath("/subjects");
  revalidatePath("/");
}

export async function createTopic(chapterId: string, name: string) {
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
  await prisma.topic.delete({ where: { id } });
  revalidatePath("/subjects");
  revalidatePath("/");
}
