"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import {
  MAX_PHOTOS_PER_LOG,
  PhotoValidationError,
  deletePhoto,
  savePhotoBytes,
} from "@/lib/photos";
import { uploadOneEvidencePhoto } from "@/lib/evidenceUpload";

function revalidatePhotoPaths() {
  revalidatePath("/daily");
  revalidatePath("/");
  revalidatePath("/daily/new");
}

async function storeOnePhoto(dailyLogId: string, file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const stored = await savePhotoBytes(bytes, file.type || "image/jpeg", {
    folder: "bromonitor/evidence",
  });
  const photo = await prisma.photo.create({
    data: {
      dailyLogId,
      publicId: stored.publicId,
      url: stored.url,
      filename: stored.filename,
      mime: stored.mime,
      size: stored.size,
      sha256: stored.sha,
    },
  });
  return photo.id;
}

/** Upload a single evidence photo (legacy Server Action — prefer /api/photos/upload). */
export async function uploadDailyPhoto(
  dailyLogId: string,
  formData: FormData,
): Promise<
  | { ok: true; id: string; url: string }
  | { ok: false; error: string }
> {
  const file = formData.get("photo");
  if (!(file instanceof File)) {
    return { ok: false, error: "No photo in request." };
  }
  const result = await uploadOneEvidencePhoto(dailyLogId, file);
  if (result.ok) revalidatePhotoPaths();
  return result;
}

export async function uploadDailyEvidence(
  dailyLogId: string,
  formData: FormData,
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  try {
    await requireRole(["student", "admin"]);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Not allowed.",
    };
  }

  const log = await prisma.dailyLog.findUnique({ where: { id: dailyLogId } });
  if (!log) return { ok: false, error: "Daily log not found." };

  const files = formData.getAll("photos").filter((f) => f instanceof File) as File[];
  if (files.length === 0) return { ok: false, error: "No photos selected." };

  const existingCount = await prisma.photo.count({ where: { dailyLogId } });
  const room = Math.max(0, MAX_PHOTOS_PER_LOG - existingCount);
  if (room === 0) {
    return {
      ok: false,
      error: `This log already has ${MAX_PHOTOS_PER_LOG} photos. Delete one before adding more.`,
    };
  }
  const acceptable = files.slice(0, room);

  try {
    const ids = await Promise.all(
      acceptable.filter((f) => f.size > 0).map((f) => storeOnePhoto(dailyLogId, f)),
    );
    revalidatePhotoPaths();
    return { ok: true, ids };
  } catch (e) {
    if (e instanceof PhotoValidationError) {
      return { ok: false, error: e.message };
    }
    throw e;
  }
}

export async function deleteDailyPhoto(id: string) {
  try {
    await requireRole(["student", "admin"]);
  } catch (e) {
    throw e instanceof Error ? e : new Error("Forbidden");
  }
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return;
  await deletePhoto({ publicId: photo.publicId, filename: photo.filename });
  await prisma.photo.delete({ where: { id } });
  revalidatePhotoPaths();
}
