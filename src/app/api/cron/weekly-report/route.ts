// POST /api/cron/weekly-report
// Header: x-cron-secret: $CRON_SECRET
// Generates last week's report (if not already generated) and emails it.

import { NextResponse } from "next/server";
import {
  emailWeeklyReport,
  generateAndStoreWeeklyReport,
} from "@/lib/ai/weeklyReport";
import { checkCronSecret } from "@/lib/cron";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = checkCronSecret(req);
  if (!auth.ok) return auth.response;

  try {
    const { report } = await generateAndStoreWeeklyReport({ overwrite: true });
    const email = await emailWeeklyReport(report.id);
    return NextResponse.json({
      ok: true,
      reportId: report.id,
      title: report.title,
      email,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "Use POST with x-cron-secret header.",
      example:
        "curl -X POST -H 'x-cron-secret: <CRON_SECRET>' http://localhost:3000/api/cron/weekly-report",
    },
    { status: 405 }
  );
}
