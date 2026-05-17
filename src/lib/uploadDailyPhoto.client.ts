/** Client helpers for daily evidence — JSON base64 upload (reliable on iOS Safari). */

import { apiJson } from "@/lib/apiFetch.client";
import { blobToBase64, prepareUploadFile } from "@/lib/prepareUploadFile.client";

export type DailyPhotoUploadResult =
  | { ok: true; id: string; url: string }
  | { ok: false; error: string };

const MAX_UPLOAD_BYTES = 7 * 1024 * 1024;

export async function postDailyPhotoUpload(
  dailyLogId: string,
  file: File,
): Promise<DailyPhotoUploadResult> {
  try {
    const prepared = await prepareUploadFile(file);
    if (prepared.size > MAX_UPLOAD_BYTES) {
      return {
        ok: false,
        error: `Photo too large (${(prepared.size / 1024 / 1024).toFixed(1)} MB). Max 7 MB.`,
      };
    }
    const base64 = await blobToBase64(prepared);
    const data = await apiJson<DailyPhotoUploadResult>("/api/photos/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dailyLogId,
        base64,
        mime: prepared.type || "image/jpeg",
        name: prepared.name || "photo.jpg",
      }),
    });
    if (!data || typeof data !== "object" || !("ok" in data)) {
      return { ok: false, error: "Upload failed. Try again." };
    }
    return data;
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
