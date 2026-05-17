/** Client helper — POST doubt with optional image (multipart + JSON fallback). */

import { apiJson } from "@/lib/apiFetch.client";
import { blobToBase64, prepareUploadFile } from "@/lib/prepareUploadFile.client";

export type CreateDoubtClientResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

async function createDoubtMultipart(
  payload: Record<string, string>,
  imageFile: File | null,
): Promise<CreateDoubtClientResult> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(payload)) {
    if (v) fd.set(k, v);
  }
  if (imageFile) {
    fd.set("image", imageFile, imageFile.name || "doubt.jpg");
  }
  const data = await apiJson<CreateDoubtClientResult>("/api/doubts/create", {
    method: "POST",
    body: fd,
  });
  if (!data || typeof data !== "object" || !("ok" in data)) {
    return { ok: false, error: "Could not add doubt. Try again." };
  }
  return data;
}

export async function postCreateDoubt(
  form: HTMLFormElement,
  imageFile: File | null,
): Promise<CreateDoubtClientResult> {
  try {
    const fd = new FormData(form);
    const payload: Record<string, string> = {
      subjectId: String(fd.get("subjectId") ?? "").trim(),
      question: String(fd.get("question") ?? "").trim(),
      chapter: String(fd.get("chapter") ?? "").trim(),
      topic: String(fd.get("topic") ?? "").trim(),
    };

    let preparedImage: File | null = null;
    if (imageFile) {
      preparedImage = await prepareUploadFile(imageFile);
    }

    const multipart = await createDoubtMultipart(payload, preparedImage);
    if (multipart.ok || !preparedImage) return multipart;

    if (preparedImage.size <= 2.5 * 1024 * 1024) {
      const base64 = await blobToBase64(preparedImage);
      const data = await apiJson<CreateDoubtClientResult>("/api/doubts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          imageBase64: base64,
          imageMime: preparedImage.type || "image/jpeg",
          imageName: preparedImage.name || "doubt.jpg",
        }),
      });
      if (!data || typeof data !== "object" || !("ok" in data)) {
        return { ok: false, error: multipart.error || "Could not add doubt." };
      }
      return data;
    }

    return multipart;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not add doubt.",
    };
  }
}
