// GET /api/reports/:id — used by client components to fetch a freshly
// generated report (TestBriefPanel re-fetches after generation).
//
// Authorization:
//   - weekly / monthly reports  → guardian / admin only (report:view).
//   - test_brief                → anyone authenticated (student also needs
//     these since the brief panel renders on /tests for him).
//   - unknown kinds             → forbidden.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { can, currentRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const role = await currentRole();
  if (!role) {
    return NextResponse.json(
      { ok: false, error: "Not signed in" },
      { status: 401 },
    );
  }

  const report = await prisma.aiReport.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      kind: true,
      title: true,
      body: true,
      model: true,
      generatedAt: true,
      emailedAt: true,
      emailedTo: true,
    },
  });
  if (!report) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const isTestBrief = report.kind === "test_brief";
  const allowed = isTestBrief ? true : can(role, "report:view");
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 },
    );
  }

  return NextResponse.json({
    id: report.id,
    kind: report.kind,
    title: report.title,
    body: report.body,
    model: report.model,
    generatedAt: report.generatedAt.toISOString(),
    emailedAt: report.emailedAt?.toISOString() ?? null,
    emailedTo: report.emailedTo,
  });
}
