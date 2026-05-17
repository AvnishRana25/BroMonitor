import Link from "next/link";

type Row = {
  subjectId: string;
  subject: string;
  short: string;
  color: string;
  plannedHours: number;
  actualHours: number;
};

type Props = {
  weekLabel: string;
  rows: Row[];
  hasPlan: boolean;
  canEditPlan: boolean;
  pacePct?: number | null;
  elapsedDays?: number;
};

// Compact horizontal bars: planned shown as faint, actual as solid color. Cap
// the visual to 150% so a banner week doesn't squash the others, but show the
// numeric value separately.
export function PlanVsActual({
  weekLabel,
  rows,
  hasPlan,
  canEditPlan,
  pacePct = null,
  elapsedDays = 7,
}: Props) {
  if (!hasPlan) {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm font-semibold">Planned vs actual</div>
            <div className="text-xs text-ink-faint">No plan set for {weekLabel}.</div>
          </div>
          {canEditPlan && (
            <Link href="/plan" className="text-xs text-accent hover:underline">
              Set plan →
            </Link>
          )}
        </div>
      </div>
    );
  }

  const maxScale = Math.max(
    1,
    ...rows.map((r) => Math.max(r.plannedHours, r.actualHours))
  );
  const visualMax = Math.max(maxScale, 1) * 1.0; // 100% of the bigger of the two

  const totalPlanned = rows.reduce((s, r) => s + r.plannedHours, 0);
  const totalActual = rows.reduce((s, r) => s + r.actualHours, 0);
  const totalPct =
    totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-sm font-semibold">
            Planned vs actual
            <span className="text-xs text-ink-faint font-normal ml-2">
              {weekLabel}
            </span>
          </div>
          <div className="text-xs text-ink-faint mt-0.5">
            {totalActual.toFixed(1)}h logged / {totalPlanned.toFixed(1)}h week
            goal
            {pacePct != null ? (
              <>
                {" "}
                ·{" "}
                <span
                  className={
                    pacePct >= 90
                      ? "text-good"
                      : pacePct >= 70
                      ? "text-warn"
                      : "text-bad"
                  }
                >
                  {pacePct}% on pace
                </span>{" "}
                (day {elapsedDays}/7)
              </>
            ) : (
              <> ({totalPct}% of week goal)</>
            )}
          </div>
        </div>
        {canEditPlan && (
          <Link href="/plan" className="text-xs text-accent hover:underline">
            Edit plan →
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const plannedPctOfMax = Math.min(
            100,
            (r.plannedHours / visualMax) * 100
          );
          const actualPctOfMax = Math.min(
            100,
            (r.actualHours / visualMax) * 100
          );
          const onTrack = r.actualHours >= r.plannedHours * 0.9;
          const halfway = r.actualHours >= r.plannedHours * 0.5;
          const deltaTone = onTrack
            ? "text-good"
            : halfway
            ? "text-warn"
            : "text-bad";
          return (
            <div key={r.subjectId}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">{r.subject}</span>
                <span className="text-ink-faint">
                  <span className={deltaTone}>
                    {r.actualHours.toFixed(1)}h
                  </span>{" "}
                  / {r.plannedHours}h
                </span>
              </div>
              <div className="relative h-2.5 rounded-full bg-bg-soft overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${plannedPctOfMax}%`,
                    background: `${r.color}33`,
                  }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${actualPctOfMax}%`,
                    background: r.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
