/** Shared fetch helper for JSON API routes (uploads, ensure log, etc.). */

export function apiUrl(path: string): string {
  if (typeof window !== "undefined") {
    return new URL(path, window.location.origin).href;
  }
  return path;
}

export async function apiJson<T extends { ok: boolean }>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    redirect: "manual",
  });

  if (res.status === 0) {
    return {
      ok: false,
      error: "Network error. Check your connection and try again.",
    } as unknown as T;
  }

  if (
    res.status === 301 ||
    res.status === 302 ||
    res.status === 307 ||
    res.status === 308
  ) {
    return {
      ok: false,
      error: "Session expired. Open /unlock, sign in again, then retry.",
    } as unknown as T;
  }

  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
      return {
        ok: false,
        error:
          res.status === 401
            ? "Not signed in. Open /unlock and sign in again."
            : `Request failed (HTTP ${res.status}). Refresh and try again.`,
      } as unknown as T;
    }
    return {
      ok: false,
      error: text.slice(0, 200) || `Request failed (HTTP ${res.status}).`,
    } as unknown as T;
  }
}
