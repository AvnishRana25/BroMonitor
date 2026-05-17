import Link from "next/link";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { can, currentRole } from "@/lib/session";
import { evaluateAlerts } from "@/lib/rules";
import { AlertsView, type AlertRow } from "@/components/AlertsView";
import { ReevalButton, ClearResolvedButton } from "./ClientButtons";
import { Siren } from "lucide-react";

export const dynamic = "force-dynamic";

function toRow(a: {
  id: string;
  kind: string;
  severity: string;
  title: string;
  body: string;
  suggestion: string | null;
  createdAt: Date;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
  resolvedAt: Date | null;
  snoozedUntil: Date | null;
  snoozedBy: string | null;
  payload: string | null;
}): AlertRow {
  return {
    id: a.id,
    kind: a.kind,
    severity: a.severity as "info" | "warn" | "red",
    title: a.title,
    body: a.body,
    suggestion: a.suggestion,
    createdAt: a.createdAt.toISOString(),
    acknowledgedAt: a.acknowledgedAt?.toISOString() ?? null,
    acknowledgedBy: a.acknowledgedBy,
    resolvedAt: a.resolvedAt?.toISOString() ?? null,
    snoozedUntil: a.snoozedUntil?.toISOString() ?? null,
    snoozedBy: a.snoozedBy,
    canAck: true,
    payloadJson: a.payload,
  };
}

export default async function AlertsPage() {
  const role = await currentRole();
  if (!can(role, "alert:view")) {
    redirect("/");
  }

  await evaluateAlerts();

  const now = new Date();
  const [activeRows, snoozedRows, acknowledged, resolved] = await Promise.all([
    prisma.alert.findMany({
      where: {
        resolvedAt: null,
        acknowledgedAt: null,
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lt: now } }],
      },
    }),
    prisma.alert.findMany({
      where: {
        resolvedAt: null,
        acknowledgedAt: null,
        snoozedUntil: { gte: now },
      },
    }),
    prisma.alert.findMany({
      where: { resolvedAt: null, acknowledgedAt: { not: null } },
    }),
    prisma.alert.findMany({
      where: { resolvedAt: { not: null } },
      orderBy: { resolvedAt: "desc" },
      take: 30,
    }),
  ]);

  const redCount = activeRows.filter((a) => a.severity === "red").length;
  const warnCount = activeRows.filter((a) => a.severity === "warn").length;

  return (
    <div className="space-y-5 max-w-4xl mx-auto w-full pb-24 md:pb-6">
      <div className="card p-4 sm:p-5 border-accent/25 bg-gradient-to-br from-accent/10 to-bg-card">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-accent">
              <Siren className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider font-medium">
                {role === "guardian" ? "Father" : "Admin"} — alerts
              </span>
            </div>
            <h1 className="text-lg font-semibold mt-1">
              {activeRows.length === 0
                ? "All clear"
                : `${redCount} red · ${warnCount} warn · ${activeRows.length - redCount - warnCount} info`}
            </h1>
            <p className="text-sm text-ink-dim mt-1 max-w-xl">
              Each flag is a deterministic rule with a clear reason — not AI
              guesswork. Snooze to hide temporarily; acknowledge once
              you&apos;ve acted.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <ReevalButton />
            {can(role, "alert:delete") && <ClearResolvedButton />}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <QuickLink href="/daily">Daily logs</QuickLink>
          <QuickLink href="/reports">Reports</QuickLink>
          <QuickLink href="/plan">Weekly plan</QuickLink>
          <QuickLink href="/doubts">Doubts</QuickLink>
          <QuickLink href="/">Dashboard</QuickLink>
        </div>
      </div>

      <AlertsView
        active={activeRows.map(toRow)}
        snoozed={snoozedRows.map(toRow)}
        acknowledged={acknowledged.map(toRow)}
        resolved={resolved.map((a) => ({ ...toRow(a), canAck: false }))}
        canAck={can(role, "alert:ack")}
        canSnooze={can(role, "alert:snooze")}
        canDelete={can(role, "alert:delete")}
      />
    </div>
  );
}

function QuickLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="chip hover:bg-accent/15 hover:border-accent/40 transition"
    >
      {children}
    </Link>
  );
}
