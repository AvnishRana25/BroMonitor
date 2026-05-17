/** Client helper — POST doubt with optional image (not a Server Action). */

export type CreateDoubtClientResult =
  | { ok: true; id: string }
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
        error: `Could not add doubt (HTTP ${res.status}). Try refreshing.`,
      } as T;
    }
    return {
      ok: false,
      error: text.slice(0, 200) || `Could not add doubt (HTTP ${res.status}).`,
    } as T;
  }
}

export async function postCreateDoubt(
  formData: FormData,
): Promise<CreateDoubtClientResult> {
  const res = await fetch("/api/doubts/create", {
    method: "POST",
    body: formData,
    credentials: "same-origin",
  });
  const data = await parseJsonResponse<CreateDoubtClientResult>(res);
  if (!data || typeof data !== "object" || !("ok" in data)) {
    return { ok: false, error: "Could not add doubt. Try again." };
  }
  return data;
}
