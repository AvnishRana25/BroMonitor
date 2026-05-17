// Shared CRON_SECRET check for all /api/cron/* routes. Returns a
// discriminated union so the route can short-circuit cleanly:
//
//   const auth = checkCronSecret(req);
//   if (!auth.ok) return auth.response;
//
// HTTP codes:
//   500 — CRON_SECRET env var not set (misconfiguration)
//   401 — header missing entirely
//   403 — header present but doesn't match
//
// This split matters because external schedulers (Vercel cron, GitHub
// Actions) retry on 5xx but treat 4xx as fatal — exactly the behaviour
// we want.

import { NextResponse } from "next/server";

export type CronAuthResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

export function checkCronSecret(req: Request): CronAuthResult {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error:
            "CRON_SECRET is not configured. Set it in .env and restart the server.",
        },
        { status: 500 },
      ),
    };
  }
  const got = req.headers.get("x-cron-secret")?.trim();
  if (!got) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Missing x-cron-secret header." },
        { status: 401 },
      ),
    };
  }
  if (!constantTimeEqual(got, expected)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Bad x-cron-secret value." },
        { status: 403 },
      ),
    };
  }
  return { ok: true };
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
