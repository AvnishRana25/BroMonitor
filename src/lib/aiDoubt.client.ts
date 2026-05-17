/** Client helper — POST AI answer request (not a Server Action). */

export type AiDoubtResult =
  | { ok: true; answer: string; confident: boolean }
  | { ok: false; error: string };

export async function postAiDoubtAnswer(doubtId: string): Promise<AiDoubtResult> {
  const res = await fetch(`/api/doubts/${doubtId}/ai`, {
    method: "POST",
    credentials: "same-origin",
  });
  const text = await res.text();
  let data: AiDoubtResult;
  try {
    data = JSON.parse(text) as AiDoubtResult;
  } catch {
    return {
      ok: false,
      error: res.ok
        ? "Could not read AI response."
        : `AI request failed (HTTP ${res.status}). Try again.`,
    };
  }
  if (!data || typeof data !== "object" || !("ok" in data)) {
    return { ok: false, error: "Could not get an AI answer. Try again." };
  }
  return data;
}
