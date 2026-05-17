import "server-only";

import { prisma } from "@/lib/db";
import {
  PhotoValidationError,
  isCloudinaryConfigured,
  uploadDoubtImage,
} from "@/lib/photos";
import { readFormUpload } from "@/lib/formUpload";
import { can, currentRole } from "@/lib/session";

const MAX_QUESTION_LEN = 2000;
const MAX_CHAPTER_LEN = 200;
const MAX_TOPIC_LEN = 200;

export type CreateDoubtResult =
  | { ok: true; id: string }
  | { ok: false; error: string; status?: number };

/** Core doubt create — safe to call from Route Handlers (not a Server Action). */
export async function createDoubtFromFormData(
  formData: FormData,
): Promise<CreateDoubtResult> {
  const role = await currentRole();
  if (!role) {
    return { ok: false, error: "Not signed in.", status: 401 };
  }
  if (!can(role, "doubt:create")) {
    return { ok: false, error: "You cannot add doubts.", status: 403 };
  }

  const subjectId = ((formData.get("subjectId") as string) || "").trim();
  const question = ((formData.get("question") as string) || "").trim();
  const imageUpload = await readFormUpload(formData.get("image"), "doubt.jpg");
  const hasImage = !!imageUpload;

  if (!subjectId) {
    return { ok: false, error: "Pick a subject.", status: 400 };
  }
  if (!question && !hasImage) {
    return {
      ok: false,
      error: "Type the doubt or attach a photo of the problem.",
      status: 400,
    };
  }
  if (question.length > MAX_QUESTION_LEN) {
    return {
      ok: false,
      error: `Doubt is too long (${question.length} chars). Keep it under ${MAX_QUESTION_LEN}.`,
      status: 400,
    };
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
      return {
        ok: false,
        error:
          "Image upload needs Cloudinary (CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET) on the server.",
        status: 503,
      };
    }
    try {
      const up = await uploadDoubtImage(imageUpload!.bytes, imageUpload!.mime);
      imagePublicId = up.publicId;
      imageUrl = up.url;
      imageMime = up.mime;
    } catch (e) {
      const message =
        e instanceof PhotoValidationError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not upload doubt image.";
      return { ok: false, error: message, status: 400 };
    }
  }

  try {
    const doubt = await prisma.doubt.create({
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
    return { ok: true, id: doubt.id };
  } catch (e) {
    console.error("doubt create failed:", e);
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Could not save doubt. Check database connection.",
      status: 500,
    };
  }
}
