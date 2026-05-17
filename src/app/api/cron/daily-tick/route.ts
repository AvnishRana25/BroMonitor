// GET/POST /api/cron/daily-tick
//
// Single Vercel cron entry point — hobby plan only allows a couple of cron
// jobs, so we centralise the scheduling logic here rather than spawning
// three separate cron rows.
//
// On every run (intended schedule: once a day at 18:30 IST = 13:00 UTC):
//   - Always: refresh test briefs for tests within the next 7 days.
//   - Sundays: generate + email the past week's report.
//   - Day 1 of the month: generate + email the previous month's report.
//
// Auth: same as other /api/cron/* endpoints — `x-cron-secret` header or
// `Authorization: Bearer <CRON_SECRET>` (which Vercel Cron sends natively).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  emailMonthlyReport,
  generateAndStoreMonthlyReport,
} from "@/lib/ai/monthlyReport";
import {
  emailWeeklyReport,
  generateAndStoreWeeklyReport,
} from "@/lib/ai/weeklyReport";
import { generateAndStoreTestBrief } from "@/lib/ai/testBrief";
import { checkCronSecret } from "@/lib/cron";
import { addDays, startOfDay } from "@/lib/utils";

export const dynamic = "force-dynamic";
// Generating AI reports can take 20-40s on Gemini's free tier.
export const maxDuration = 60;

async function handle(req: Request) {
  const auth = checkCronSecret(req);
  if (!auth.ok) return auth.response;

  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday
  const dayOfMonth = now.getUTCDate();

  const results: Record<string, unknown> = { ranAt: now.toISOString() };
  const errors: Record<string, string> = {};

  // 1) Test briefs — every day, only for tests in the next 7 days.
  try {
    const today = startOfDay(now);
    const horizon = addDays(today, 7);
    const tests = await prisma.upcomingTest.findMany({
      where: { date: { gte: today, lte: horizon } },
      orderBy: { date: "asc" },
    });
    const briefResults: Array<{ testId: string; ok: boolean; error?: string }> = [];
    for (const t of tests) {
      try {
        await generateAndStoreTestBrief({ upcomingTestId: t.id, overwrite: true });
        briefResults.push({ testId: t.id, ok: true });
      } catch (e) {
        briefResults.push({
          testId: t.id,
          ok: false,
          error: e instanceof Error ? e.message : "failed",
        });
      }
    }
    results.testBriefs = { count: briefResults.length, results: briefResults };
  } catch (e) {
    errors.testBriefs = e instanceof Error ? e.message : "failed";
  }

  // 2) Weekly report — Sundays only.
  if (dayOfWeek === 0) {
    try {
      const { report } = await generateAndStoreWeeklyReport({ overwrite: true });
      const email = await emailWeeklyReport(report.id);
      results.weeklyReport = { reportId: report.id, email };
    } catch (e) {
      errors.weeklyReport = e instanceof Error ? e.message : "failed";
    }
  }

  // 3) Monthly report — 1st of every month only.
  if (dayOfMonth === 1) {
    try {
      const { report } = await generateAndStoreMonthlyReport({ overwrite: true });
      const email = await emailMonthlyReport(report.id);
      results.monthlyReport = { reportId: report.id, email };
    } catch (e) {
      errors.monthlyReport = e instanceof Error ? e.message : "failed";
    }
  }

  const hasErrors = Object.keys(errors).length > 0;
  return NextResponse.json(
    { ok: !hasErrors, results, errors: hasErrors ? errors : undefined },
    { status: hasErrors ? 207 : 200 },
  );
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
