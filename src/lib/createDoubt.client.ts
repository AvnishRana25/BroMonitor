/** Client helper — POST doubt with optional image (not a Server Action). */

import { apiJson } from "@/lib/apiFetch.client";

export type CreateDoubtClientResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function postCreateDoubt(
  formData: FormData,
): Promise<CreateDoubtClientResult> {
  const data = await apiJson<CreateDoubtClientResult>("/api/doubts/create", {
    method: "POST",
    body: formData,
  });
  if (!data || typeof data !== "object" || !("ok" in data)) {
    return { ok: false, error: "Could not add doubt. Try again." };
  }
  return data;
}
