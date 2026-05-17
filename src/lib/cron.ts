// Shared CRON_SECRET check for all /api/cron/* routes. Returns a
// discriminated union so the route can short-circuit cleanly:
//
//   const auth = checkCronSecret(req);
//   if (!auth.ok) return auth.response;
//
// Accepted credentials (whichever is present, constant-time compared):
//   - Header  x-cron-secret: <secret>                 (curl / GitHub Actions)
//   - Header  Authorization: Bearer <secret>          (Vercel Cron native)
//
// HTTP codes:
//   500 — CRON_SECRET env var not set (misconfiguration)
//   401 — no credentials supplied at all
//   403 — credentials supplied but don't match
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
            "CRON_SECRET is not configured. Set it in the deployment environment and redeploy.",
        },
        { status: 500 },
      ),
    };
  }

  const xHeader = req.headers.get("x-cron-secret")?.trim();
  const authHeader = req.headers.get("authorization")?.trim();
  let bearer: string | null = null;
  if (authHeader && /^Bearer\s+/i.test(authHeader)) {
    bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
  }

  const supplied = xHeader || bearer;
  if (!supplied) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error:
            "Missing credentials. Send either `x-cron-secret: <secret>` or `Authorization: Bearer <secret>`.",
        },
        { status: 401 },
      ),
    };
  }
  if (!constantTimeEqual(supplied, expected)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Bad cron credentials." },
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
