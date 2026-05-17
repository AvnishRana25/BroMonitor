/** Client helper — POST doubt with optional image (JSON + base64 for mobile). */

import { apiJson } from "@/lib/apiFetch.client";
import { blobToBase64, prepareUploadFile } from "@/lib/prepareUploadFile.client";

export type CreateDoubtClientResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

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

    if (imageFile) {
      const prepared = await prepareUploadFile(imageFile);
      payload.imageBase64 = await blobToBase64(prepared);
      payload.imageMime = prepared.type || "image/jpeg";
      payload.imageName = prepared.name || "doubt.jpg";
    }

    const data = await apiJson<CreateDoubtClientResult>("/api/doubts/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!data || typeof data !== "object" || !("ok" in data)) {
      return { ok: false, error: "Could not add doubt. Try again." };
    }
    return data;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not add doubt.",
    };
  }
}
