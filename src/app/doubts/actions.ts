"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import {
  answerDoubtWithAi,
  resolveDoubtByAi as resolveDoubtByAiLib,
} from "@/lib/ai/doubt";
import { deletePhoto } from "@/lib/photos";
import { createDoubtFromFormData } from "@/lib/doubtCreate";

/** @deprecated Prefer POST /api/doubts/create from the client. */
export async function createDoubt(
  formData: FormData,
): Promise<{ id: string }> {
  const result = await createDoubtFromFormData(formData);
  if (!result.ok) throw new Error(result.error);
  revalidatePath("/doubts");
  revalidatePath("/");
  return { id: result.id };
}

export async function resolveDoubt(id: string, by: string) {
  await requireRole(["student", "admin"]);
  await prisma.doubt.update({
    where: { id },
    data: { status: "resolved", resolvedAt: new Date(), resolvedBy: by },
  });
  revalidatePath("/doubts");
  revalidatePath("/");
}

export async function deleteDoubt(id: string) {
  // Brother (student) owns these — he should be able to clear his own typos
  // and mistakes. Guardian intentionally can't delete; admin always can.
  await requireRole(["student", "admin"]);
  const doubt = await prisma.doubt.findUnique({ where: { id } });
  if (!doubt) return;
  if (doubt.imagePublicId) {
    await deletePhoto({ publicId: doubt.imagePublicId, filename: null });
  }
  await prisma.doubt.delete({ where: { id } });
  revalidatePath("/doubts");
  revalidatePath("/");
}

export async function reopenDoubt(id: string) {
  await requireRole(["student", "admin"]);
  await prisma.doubt.update({
    where: { id },
    data: { status: "open", resolvedAt: null, resolvedBy: null },
  });
  revalidatePath("/doubts");
  revalidatePath("/");
}

/** @deprecated Prefer POST /api/doubts/:id/ai from the client. */
export async function getAiDoubtAnswer(id: string) {
  try {
    await requireRole(["student", "guardian", "admin"]);
    const result = await answerDoubtWithAi(id);
    revalidatePath("/doubts");
    return { ok: true as const, ...result };
  } catch (e) {
    return {
      ok: false as const,
      error:
        e instanceof Error
          ? e.message
          : "Could not get an AI answer. Try again in a minute.",
    };
  }
}

export async function clearAiDoubtAnswer(id: string) {
  await requireRole(["student", "admin"]);
  await prisma.doubt.update({
    where: { id },
    data: {
      aiAnswer: null,
      aiConfident: null,
      aiAnsweredAt: null,
      aiModel: null,
    },
  });
  revalidatePath("/doubts");
}

export async function markDoubtResolvedByAi(id: string) {
  await requireRole(["student", "admin"]);
  await resolveDoubtByAiLib(id);
  revalidatePath("/doubts");
  revalidatePath("/");
}
