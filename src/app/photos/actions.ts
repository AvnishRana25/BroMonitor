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

export async function uploadDailyEvidence(
  dailyLogId: string,
  formData: FormData,
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  await requireRole(["student", "admin"]); // evidence:upload

  const log = await prisma.dailyLog.findUnique({ where: { id: dailyLogId } });
  if (!log) return { ok: false, error: "Daily log not found." };

  const files = formData.getAll("photos").filter((f) => f instanceof File) as File[];
  if (files.length === 0) return { ok: false, error: "No photos selected." };

  const existingCount = await prisma.photo.count({ where: { dailyLogId } });
  const room = Math.max(0, MAX_PHOTOS_PER_LOG - existingCount);
  if (room === 0) {
    return {
      ok: false,
      error: `This log already has ${MAX_PHOTOS_PER_LOG} photos (the per-log cap). Delete one before adding more.`,
    };
  }
  const acceptable = files.slice(0, room);

  const ids: string[] = [];
  for (const file of acceptable) {
    if (!file.size) continue;
    try {
      const bytes = await file.arrayBuffer();
      const stored = await savePhotoBytes(bytes, file.type);
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
      ids.push(photo.id);
    } catch (e) {
      if (e instanceof PhotoValidationError) {
        return { ok: false, error: e.message };
      }
      throw e;
    }
  }

  revalidatePath("/daily");
  revalidatePath("/");
  return { ok: true, ids };
}

export async function deleteDailyPhoto(id: string) {
  await requireRole(["admin"]);
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return;
  await deletePhoto({ publicId: photo.publicId, filename: photo.filename });
  await prisma.photo.delete({ where: { id } });
  revalidatePath("/daily");
  revalidatePath("/");
}
