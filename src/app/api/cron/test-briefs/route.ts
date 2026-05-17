// POST /api/cron/test-briefs
// Header: x-cron-secret: $CRON_SECRET
// For every UpcomingTest within the next 7 days, generate a brief if missing
// (or refresh if the test date moved). Run daily.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateAndStoreTestBrief } from "@/lib/ai/testBrief";
import { addDays, startOfDay } from "@/lib/utils";
import { checkCronSecret } from "@/lib/cron";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = checkCronSecret(req);
  if (!auth.ok) return auth.response;

  const today = startOfDay(new Date());
  const horizon = addDays(today, 7);
  const tests = await prisma.upcomingTest.findMany({
    where: { date: { gte: today, lte: horizon } },
    orderBy: { date: "asc" },
  });

  const results: Array<{ testId: string; regenerated: boolean; error?: string }> =
    [];
  for (const t of tests) {
    try {
      const res = await generateAndStoreTestBrief({
        upcomingTestId: t.id,
        overwrite: true, // refresh daily so countdown text stays accurate
      });
      results.push({ testId: t.id, regenerated: res.regenerated });
    } catch (e) {
      results.push({
        testId: t.id,
        regenerated: false,
        error: e instanceof Error ? e.message : "Failed",
      });
    }
  }
  return NextResponse.json({ ok: true, count: results.length, results });
}
