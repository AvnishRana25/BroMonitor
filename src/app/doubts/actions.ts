"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import {
  answerDoubtWithAi,
  resolveDoubtByAi as resolveDoubtByAiLib,
} from "@/lib/ai/doubt";
import {
  PhotoValidationError,
  deletePhoto,
  isCloudinaryConfigured,
  uploadDoubtImage,
} from "@/lib/photos";

// Reasonable upper bound for question text — long enough for a multi-line
// problem statement, short enough to keep the DB / AI prompt bounded.
// We allow empty question text when an image is attached, since the image
// IS the doubt (a photo of a problem from the textbook).
const MAX_QUESTION_LEN = 2000;
const MAX_CHAPTER_LEN = 200;
const MAX_TOPIC_LEN = 200;

export async function createDoubt(formData: FormData) {
  await requireRole(["student", "admin"]);
  const subjectId = ((formData.get("subjectId") as string) || "").trim();
  const question = ((formData.get("question") as string) || "").trim();
  const imageFile = formData.get("image");
  const hasImage = imageFile instanceof File && imageFile.size > 0;
  if (!subjectId) return;
  if (!question && !hasImage) return;
  if (question.length > MAX_QUESTION_LEN) {
    throw new Error(
      `Doubt is too long (${question.length} chars). Keep it under ${MAX_QUESTION_LEN}.`,
    );
  }
  const chapter =
    ((formData.get("chapter") as string) || "").trim().slice(0, MAX_CHAPTER_LEN) ||
    null;
  const topic =
    ((formData.get("topic") as string) || "").trim().slice(0, MAX_TOPIC_LEN) ||
    null;

  let imagePublicId: string | null = null;
  let imageUrl: string | null = null;
  let imageMime: string | null = null;
  if (hasImage) {
    if (!isCloudinaryConfigured()) {
      throw new PhotoValidationError(
        "Image upload needs Cloudinary credentials in .env (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).",
      );
    }
    const file = imageFile as File;
    const bytes = await file.arrayBuffer();
    const up = await uploadDoubtImage(bytes, file.type);
    imagePublicId = up.publicId;
    imageUrl = up.url;
    imageMime = up.mime;
  }

  await prisma.doubt.create({
    data: {
      subjectId,
      question: question || "(image-only doubt)",
      chapter,
      topic,
      imagePublicId,
      imageUrl,
      imageMime,
    },
  });
  revalidatePath("/doubts");
  revalidatePath("/");
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

export async function getAiDoubtAnswer(id: string) {
  await requireRole(["student", "guardian", "admin"]);
  try {
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
