import "server-only";

import { prisma } from "@/lib/db";
import {
  MAX_PHOTOS_PER_LOG,
  PhotoValidationError,
  savePhotoBytes,
} from "@/lib/photos";
import { can, currentRole } from "@/lib/session";
import type { Role } from "@/lib/auth";

export type EvidenceUploadResult =
  | { ok: true; id: string; url: string }
  | { ok: false; error: string; status?: number };

function mimeFor(file: File): string {
  if (file.type && file.type.startsWith("image/")) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
}

/** Core evidence upload — safe to call from Route Handlers (not a Server Action). */
export async function uploadOneEvidencePhoto(
  dailyLogId: string,
  file: File,
): Promise<EvidenceUploadResult> {
  const role = await currentRole();
  if (!role) {
    return { ok: false, error: "Not signed in.", status: 401 };
  }
  if (!can(role, "evidence:upload")) {
    return { ok: false, error: "You cannot upload photos.", status: 403 };
  }

  const log = await prisma.dailyLog.findUnique({ where: { id: dailyLogId } });
  if (!log) return { ok: false, error: "Daily log not found.", status: 404 };

  if (!(file instanceof File) || !file.size) {
    return { ok: false, error: "No photo in request.", status: 400 };
  }

  const existingCount = await prisma.photo.count({ where: { dailyLogId } });
  if (existingCount >= MAX_PHOTOS_PER_LOG) {
    return {
      ok: false,
      error: `Max ${MAX_PHOTOS_PER_LOG} photos per log. Delete one first.`,
      status: 400,
    };
  }

  try {
    const bytes = await file.arrayBuffer();
    const mime = mimeFor(file);
    const stored = await savePhotoBytes(bytes, mime, {
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
    return { ok: true, id: photo.id, url: `/api/photos/${photo.id}` };
  } catch (e) {
    if (e instanceof PhotoValidationError) {
      return { ok: false, error: e.message, status: 400 };
    }
    console.error("evidence upload failed:", e);
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Upload failed. Check Cloudinary and database connection.",
      status: 500,
    };
  }
}

/** Ensure a daily log row exists for progressive photo upload. */
export async function ensureDailyLogShell(
  dateStr: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string; status: number }> {
  const role = await currentRole();
  if (!role) {
    return { ok: false, error: "Not signed in.", status: 401 };
  }
  if (!can(role, "log:create")) {
    return { ok: false, error: "You cannot create daily logs.", status: 403 };
  }

  const { parseLocalDate, startOfDay } = await import("@/lib/utils");
  const date = startOfDay(parseLocalDate(dateStr));
  const log = await prisma.dailyLog.upsert({
    where: { date },
    update: {},
    create: {
      date,
      schoolHours: 0,
      coachingHours: 0,
      selfStudyHours: 0,
    },
  });
  return { ok: true, id: log.id };
}

export function roleCanUploadEvidence(role: Role | null): boolean {
  return !!role && can(role, "evidence:upload");
}
