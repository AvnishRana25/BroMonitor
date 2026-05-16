"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createDoubt(formData: FormData) {
  const subjectId = formData.get("subjectId") as string;
  const question = (formData.get("question") as string).trim();
  if (!subjectId || !question) return;
  const chapter = ((formData.get("chapter") as string) || "").trim() || null;
  const topic = ((formData.get("topic") as string) || "").trim() || null;

  await prisma.doubt.create({
    data: { subjectId, question, chapter, topic },
  });
  revalidatePath("/doubts");
  revalidatePath("/");
}

export async function resolveDoubt(id: string, by: string) {
  await prisma.doubt.update({
    where: { id },
    data: { status: "resolved", resolvedAt: new Date(), resolvedBy: by },
  });
  revalidatePath("/doubts");
  revalidatePath("/");
}

export async function deleteDoubt(id: string) {
  await prisma.doubt.delete({ where: { id } });
  revalidatePath("/doubts");
  revalidatePath("/");
}

export async function reopenDoubt(id: string) {
  await prisma.doubt.update({
    where: { id },
    data: { status: "open", resolvedAt: null, resolvedBy: null },
  });
  revalidatePath("/doubts");
  revalidatePath("/");
}
