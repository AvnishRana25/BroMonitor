/** Client helpers for daily evidence (Route Handlers, not Server Actions). */

import { apiJson } from "@/lib/apiFetch.client";

export type DailyPhotoUploadResult =
  | { ok: true; id: string; url: string }
  | { ok: false; error: string };

export async function postDailyPhotoUpload(
  dailyLogId: string,
  file: File,
): Promise<DailyPhotoUploadResult> {
  const fd = new FormData();
  fd.set("dailyLogId", dailyLogId);
  fd.set("photo", file);
  const data = await apiJson<DailyPhotoUploadResult>("/api/photos/upload", {
    method: "POST",
    body: fd,
  });
  if (!data || typeof data !== "object" || !("ok" in data)) {
    return { ok: false, error: "Upload failed. Try again." };
  }
  return data;
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
