import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Siren,
} from "lucide-react";

export type TodayBriefProps = {
  topAlert: {
    title: string;
    severity: "red" | "warn" | "info";
    href: string;
  } | null;
  nextTest: { name: string; daysAway: number } | null;
  masteryGap: {
    subject: string;
    pct: number;
    color: string;
    href: string;
  } | null;
  brotherLoggedToday: boolean;
  hasEvidenceToday: boolean;
};

export function FatherTodayBrief({
  topAlert,
  nextTest,
  masteryGap,
  brotherLoggedToday,
  hasEvidenceToday,
}: TodayBriefProps) {
  return (
    <div className="card p-4 sm:p-5 border-accent/30 bg-gradient-to-br from-accent/10 to-bg-card">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-wider text-accent font-medium">
            Father — today in 30 seconds
          </div>
          <div className="text-base font-semibold mt-0.5">
            What needs your attention
          </div>
        </div>
        <Link href="/alerts" className="text-xs text-accent hover:underline">
          All alerts →
        </Link>
      </div>

      <ul className="space-y-3">
        <BriefRow
          icon={
            topAlert?.severity === "red" ? (
              <Siren className="w-4 h-4 text-bad" />
            ) : topAlert ? (
              <AlertTriangle className="w-4 h-4 text-warn" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-good" />
            )
          }
          label="Priority"
          value={
            topAlert ? (
              <Link href={topAlert.href} className="hover:underline text-ink">
                {topAlert.title}
              </Link>
            ) : (
              <span className="text-good">No active red alerts</span>
            )
          }
        />
        <BriefRow
          icon={<CalendarClock className="w-4 h-4 text-ink-dim" />}
          label="Next test"
          value={
            nextTest ? (
              <span>
                {nextTest.name}
                <span
                  className={
                    nextTest.daysAway <= 3
                      ? " text-bad ml-1"
                      : nextTest.daysAway <= 7
                      ? " text-warn ml-1"
                      : " text-ink-faint ml-1"
                  }
                >
                  · {nextTest.daysAway === 0 ? "today" : `in ${nextTest.daysAway}d`}
                </span>
              </span>
            ) : (
              <span className="text-ink-faint">None scheduled</span>
            )
          }
        />
        <BriefRow
          icon={<BookOpen className="w-4 h-4 text-ink-dim" />}
          label="Weakest syllabus"
          value={
            masteryGap ? (
              <Link href={masteryGap.href} className="hover:underline">
                {masteryGap.subject}{" "}
                <span style={{ color: masteryGap.color }}>{masteryGap.pct}%</span>{" "}
                mastery
              </Link>
            ) : (
              <span className="text-ink-faint">—</span>
            )
          }
        />
      </ul>

      <div className="mt-4 pt-3 border-t border-border-soft flex flex-wrap gap-2 text-xs">
        <StatusChip
          ok={brotherLoggedToday}
          okLabel="Log filed today"
          badLabel="No log today yet"
        />
        <StatusChip
          ok={hasEvidenceToday}
          okLabel="Evidence photos"
          badLabel="No photos today"
        />
        {!brotherLoggedToday && (
          <Link href="/daily/new" className="text-accent hover:underline ml-auto">
            Remind him to log →
          </Link>
        )}
      </div>
    </div>
  );
}

function BriefRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 text-sm">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</div>
        <div className="mt-0.5 font-medium">{value}</div>
      </div>
    </li>
  );
}

function StatusChip({
  ok,
  okLabel,
  badLabel,
}: {
  ok: boolean;
  okLabel: string;
  badLabel: string;
}) {
  return (
    <span
      className={
        "chip " +
        (ok ? "text-good border-good/30 bg-good/10" : "text-warn border-warn/30 bg-warn/10")
      }
    >
      {ok ? okLabel : badLabel}
    </span>
  );
}
