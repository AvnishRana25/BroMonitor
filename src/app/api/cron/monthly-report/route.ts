// POST /api/cron/monthly-report
// Header: x-cron-secret: $CRON_SECRET
// Generates last month's synthesis report and emails it.

import { NextResponse } from "next/server";
import {
  emailMonthlyReport,
  generateAndStoreMonthlyReport,
} from "@/lib/ai/monthlyReport";
import { checkCronSecret } from "@/lib/cron";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = checkCronSecret(req);
  if (!auth.ok) return auth.response;

  try {
    const { report } = await generateAndStoreMonthlyReport({ overwrite: true });
    const email = await emailMonthlyReport(report.id);
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
