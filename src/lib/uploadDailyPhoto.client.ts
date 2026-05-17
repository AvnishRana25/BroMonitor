/** Client helpers for daily evidence — multipart + JSON fallback. */

import { apiJson } from "@/lib/apiFetch.client";
import { blobToBase64, prepareUploadFile } from "@/lib/prepareUploadFile.client";

export type DailyPhotoUploadResult =
  | { ok: true; id: string; url: string }
  | { ok: false; error: string };

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

async function uploadMultipart(
  dailyLogId: string,
  file: File,
): Promise<DailyPhotoUploadResult> {
  const fd = new FormData();
  fd.set("dailyLogId", dailyLogId);
  fd.set("photo", file, file.name || "photo.jpg");
  const data = await apiJson<DailyPhotoUploadResult>("/api/photos/upload", {
    method: "POST",
    body: fd,
  });
  if (!data || typeof data !== "object" || !("ok" in data)) {
    return { ok: false, error: "Upload failed. Try again." };
  }
  return data;
}

async function uploadJsonBase64(
  dailyLogId: string,
  file: File,
): Promise<DailyPhotoUploadResult> {
  const base64 = await blobToBase64(file);
  const data = await apiJson<DailyPhotoUploadResult>("/api/photos/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dailyLogId,
      base64,
      mime: file.type || "image/jpeg",
      name: file.name || "photo.jpg",
    }),
  });
  if (!data || typeof data !== "object" || !("ok" in data)) {
    return { ok: false, error: "Upload failed. Try again." };
  }
  return data;
}

export async function postDailyPhotoUpload(
  dailyLogId: string,
  file: File,
): Promise<DailyPhotoUploadResult> {
  try {
    const prepared = await prepareUploadFile(file);
    if (prepared.size > MAX_UPLOAD_BYTES) {
      return {
        ok: false,
        error: `Photo too large (${(prepared.size / 1024 / 1024).toFixed(1)} MB). Max 6 MB.`,
      };
    }

    // Android: multipart is faster and avoids huge JSON strings.
    const multipart = await uploadMultipart(dailyLogId, prepared);
    if (multipart.ok) return multipart;

    // Fallback to JSON if multipart failed for a recoverable reason.
    if (prepared.size <= 2.5 * 1024 * 1024) {
      const json = await uploadJsonBase64(dailyLogId, prepared);
      if (json.ok) return json;
      return { ok: false, error: json.error || multipart.error };
    }

    return multipart;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Upload failed. Try again.",
    };
  }
}

export async function postEnsureDailyLog(
  dateStr: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const data = await apiJson<
    { ok: true; id: string } | { ok: false; error: string }
  >("/api/daily/ensure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: dateStr }),
  });
  if (!data || typeof data !== "object" || !("ok" in data)) {
    return { ok: false, error: "Could not prepare log for upload." };
  }
  return data;
}
