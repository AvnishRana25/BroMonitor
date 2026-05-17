/** Client helper — POST AI answer request (not a Server Action). */

import { apiJson } from "@/lib/apiFetch.client";

export type AiDoubtResult =
  | { ok: true; answer: string; confident: boolean }
  | { ok: false; error: string };

export async function postAiDoubtAnswer(doubtId: string): Promise<AiDoubtResult> {
  const data = await apiJson<AiDoubtResult>(`/api/doubts/${doubtId}/ai`, {
    method: "POST",
  });
  if (!data || typeof data !== "object" || !("ok" in data)) {
    return { ok: false, error: "Could not get an AI answer. Try again." };
  }
  return data;
}
