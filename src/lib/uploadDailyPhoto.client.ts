/** Client helpers for daily evidence (Route Handlers, not Server Actions). */

export type DailyPhotoUploadResult =
  | { ok: true; id: string; url: string }
  | { ok: false; error: string };

async function parseJsonResponse<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    if (res.redirected || res.url.includes("/unlock")) {
      return {
        ok: false,
        error: "Session expired. Unlock the app again and retry.",
      } as T;
    }
    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
      return {
        ok: false,
        error: `Upload failed (HTTP ${res.status}). Try refreshing the page.`,
      } as T;
    }
    return {
      ok: false,
      error: text.slice(0, 200) || `Upload failed (HTTP ${res.status}).`,
    } as T;
  }
}

export async function postDailyPhotoUpload(
  dailyLogId: string,
  file: File,
): Promise<DailyPhotoUploadResult> {
  const fd = new FormData();
  fd.set("dailyLogId", dailyLogId);
  fd.set("photo", file);
  const res = await fetch("/api/photos/upload", {
    method: "POST",
    body: fd,
    credentials: "same-origin",
  });
  const data = await parseJsonResponse<DailyPhotoUploadResult>(res);
  if (!data || typeof data !== "object" || !("ok" in data)) {
    return { ok: false, error: "Upload failed. Try again." };
  }
  return data;
}

export async function postEnsureDailyLog(
  dateStr: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const res = await fetch("/api/daily/ensure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: dateStr }),
    credentials: "same-origin",
  });
  const data = await parseJsonResponse<
    { ok: true; id: string } | { ok: false; error: string }
  >(res);
  if (!data || typeof data !== "object" || !("ok" in data)) {
    return { ok: false, error: "Could not prepare log for upload." };
  }
  return data;
}
