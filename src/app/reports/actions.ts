"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import {
  emailWeeklyReport,
  generateAndStoreWeeklyReport,
} from "@/lib/ai/weeklyReport";
import {
  emailMonthlyReport,
  generateAndStoreMonthlyReport,
} from "@/lib/ai/monthlyReport";
import { generateAndStoreTestBrief } from "@/lib/ai/testBrief";
import { prisma } from "@/lib/db";

function revalidate() {
  revalidatePath("/reports");
  revalidatePath("/");
  revalidatePath("/tests");
}

export async function generateWeeklyNow(opts: { overwrite?: boolean } = {}) {
  await requireRole(["guardian", "admin"]);
  try {
    const res = await generateAndStoreWeeklyReport({ overwrite: opts.overwrite });
    revalidate();
    return {
      ok: true as const,
      id: res.report.id,
      regenerated: res.regenerated,
    };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Failed to generate weekly report",
    };
  }
}

export async function generateMonthlyNow(opts: { overwrite?: boolean } = {}) {
  await requireRole(["guardian", "admin"]);
  try {
    const res = await generateAndStoreMonthlyReport({
      overwrite: opts.overwrite,
    });
    revalidate();
    return {
      ok: true as const,
      id: res.report.id,
      regenerated: res.regenerated,
    };
  } catch (e) {
    return {
      ok: false as const,
      error:
        e instanceof Error ? e.message : "Failed to generate monthly report",
    };
  }
}

export async function emailReportNow(id: string) {
  await requireRole(["guardian", "admin"]);
  const report = await prisma.aiReport.findUnique({
    where: { id },
    select: { id: true, kind: true },
  });
  if (!report) return { ok: false as const, error: "Report not found" };
  try {
    let res: { sent: boolean; to: string; reason?: string };
    switch (report.kind) {
      case "weekly":
        res = await emailWeeklyReport(id);
        break;
      case "monthly":
        res = await emailMonthlyReport(id);
        break;
      case "test_brief":
        return {
          ok: false as const,
          error:
            "Test briefs aren't emailable — they're meant to be read on the test card before the exam.",
        };
      default:
        return {
          ok: false as const,
          error: `Unknown report kind "${report.kind}".`,
        };
    }
    revalidate();
    return res.sent
      ? { ok: true as const, to: res.to }
      : { ok: false as const, error: res.reason ?? "Email failed" };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Email failed",
    };
  }
}

export async function generateTestBriefNow(
  upcomingTestId: string,
  opts: { overwrite?: boolean } = {}
) {
  await requireRole(["student", "guardian", "admin"]);
  try {
    const res = await generateAndStoreTestBrief({
      upcomingTestId,
      overwrite: opts.overwrite,
    });
    revalidate();
    return {
      ok: true as const,
      id: res.report.id,
      regenerated: res.regenerated,
    };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Failed to generate test brief",
    };
  }
}

export async function deleteReport(id: string) {
  await requireRole(["admin"]);
  await prisma.aiReport.delete({ where: { id } });
  revalidate();
}
