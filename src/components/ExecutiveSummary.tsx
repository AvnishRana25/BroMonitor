import Link from "next/link";
import { Siren, CalendarClock, Target, Activity } from "lucide-react";
import { SubjectPill } from "@/components/SubjectPill";

type SubjectMastery = { name: string; short: string; color: string; pct: number };

type Props = {
  weekLabel: string;
  weekTrackedHours: number;
  weekGoalHours: number | null;
  daysLogged7: number;
  redAlerts: number;
  warnAlerts: number;
  nextTest: {
    name: string;
    daysAway: number;
  } | null;
  subjectMastery: SubjectMastery[];
  canSeeAlerts: boolean;
};

// One screen, big numbers. This is the first thing father sees when he opens
// the app. If a value is missing, render a clear "not set" rather than a 0
// that could lull him into thinking everything is fine.
export function ExecutiveSummary({
  weekLabel,
  weekTrackedHours,
  weekGoalHours,
  daysLogged7,
  redAlerts,
  warnAlerts,
  nextTest,
  subjectMastery,
  canSeeAlerts,
}: Props) {
  const planPct =
    weekGoalHours && weekGoalHours > 0
      ? Math.round((weekTrackedHours / weekGoalHours) * 100)
      : null;
  const planTone =
    planPct == null
      ? "text-ink"
      : planPct >= 90
      ? "text-good"
      : planPct >= 60
      ? "text-warn"
      : "text-bad";

  return (
    <div className="card p-5 bg-gradient-to-br from-bg-card to-bg-soft">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-faint">
            How he&apos;s doing
          </div>
          <div className="text-base font-semibold mt-0.5">This week</div>
        </div>
        <div className="text-xs text-ink-faint">{weekLabel}</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <Pillar
          label="Logged study"
          value={`${weekTrackedHours.toFixed(1)}h`}
          sub={
            weekGoalHours
              ? `${planPct ?? 0}% of ${weekGoalHours}h plan`
              : "no plan set"
          }
          valueClass={planTone}
          icon={<Activity className="w-4 h-4" />}
        />
        <Pillar
          label="Consistency"
          value={`${daysLogged7}/7`}
          sub="days logged last 7"
          valueClass={
            daysLogged7 >= 6
              ? "text-good"
              : daysLogged7 >= 4
              ? "text-warn"
              : "text-bad"
          }
          icon={<Target className="w-4 h-4" />}
        />
        <Pillar
          label="Open red alerts"
          value={canSeeAlerts ? redAlerts : "—"}
          sub={
            !canSeeAlerts
              ? "guardian/admin only"
              : redAlerts === 0
              ? warnAlerts === 0
                ? "all clear"
                : `${warnAlerts} warning${warnAlerts === 1 ? "" : "s"}`
              : "needs your attention"
          }
          valueClass={
            !canSeeAlerts
              ? "text-ink-faint"
              : redAlerts > 0
              ? "text-bad"
              : warnAlerts > 0
              ? "text-warn"
              : "text-good"
          }
          icon={<Siren className="w-4 h-4" />}
          href={canSeeAlerts ? "/alerts" : undefined}
        />
        <Pillar
          label="Next test"
          value={
            nextTest
              ? nextTest.daysAway === 0
                ? "Today"
                : `${nextTest.daysAway}d`
              : "—"
          }
          sub={nextTest?.name ?? "none scheduled"}
          valueClass={
            nextTest == null
              ? "text-ink-faint"
              : nextTest.daysAway <= 2
              ? "text-bad"
              : nextTest.daysAway <= 7
              ? "text-warn"
              : "text-ink"
          }
          icon={<CalendarClock className="w-4 h-4" />}
        />
      </div>

      {subjectMastery.length > 0 && (
        <div className="mt-5 pt-4 border-t border-border-soft grid grid-cols-3 gap-3">
          {subjectMastery.map((s) => (
            <div key={s.short} className="flex items-center justify-between">
              <SubjectPill name={s.name} color={s.color} />
              <span className="text-sm font-medium">{s.pct}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Pillar({
  label,
  value,
  sub,
  valueClass,
  icon,
  href,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  valueClass?: string;
  icon?: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-faint">
        {icon}
        {label}
      </div>
      <div
        className={
          "text-3xl font-semibold tracking-tight mt-1.5 " + (valueClass ?? "")
        }
      >
        {value}
      </div>
      {sub && <div className="text-xs text-ink-faint mt-1">{sub}</div>}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="block -mx-2 px-2 py-1 rounded-lg hover:bg-bg-hover transition"
      >
        {inner}
      </Link>
    );
  }
  return <div>{inner}</div>;
}
