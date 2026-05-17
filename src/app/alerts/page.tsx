import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { can, currentRole } from "@/lib/session";
import { evaluateAlerts } from "@/lib/rules";
import { AlertsView, type AlertRow } from "@/components/AlertsView";
import { ReevalButton, ClearResolvedButton } from "./ClientButtons";

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

  const [active, acknowledged, resolved] = await Promise.all([
    prisma.alert.findMany({
      where: { resolvedAt: null, acknowledgedAt: null },
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm text-ink-dim">
            {active.length} active · {acknowledged.length} acknowledged ·{" "}
            {resolved.length} recently resolved
          </div>
          <div className="text-xs text-ink-faint mt-0.5 max-w-xl">
            Each alert is a rule with a clear reason — not AI guesswork. Use the
            action link, talk it through, then acknowledge so you know what
            you&apos;ve already covered.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ReevalButton />
          {can(role, "alert:delete") && <ClearResolvedButton />}
        </div>
      </div>

      <AlertsView
        active={active.map(toRow)}
        acknowledged={acknowledged.map(toRow)}
        resolved={resolved.map((a) => ({ ...toRow(a), canAck: false }))}
        canDelete={can(role, "alert:delete")}
      />
    </div>
  );
}
