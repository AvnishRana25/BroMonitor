/** Client helper — POST evidence to /api/photos/upload (not a Server Action). */

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
  const res = await fetch("/api/photos/upload", {
    method: "POST",
    body: fd,
  });
  const data = (await res.json()) as DailyPhotoUploadResult;
  if (!data || typeof data !== "object" || !("ok" in data)) {
    return { ok: false, error: "Upload failed. Try again." };
  }
  return data;
}
