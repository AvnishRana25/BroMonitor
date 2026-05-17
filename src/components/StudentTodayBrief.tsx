import Link from "next/link";
import { Camera, CheckCircle2, Circle } from "lucide-react";

export function StudentTodayBrief({
  loggedToday,
  hasEvidence,
  hasStudyRow,
}: {
  loggedToday: boolean;
  hasEvidence: boolean;
  hasStudyRow: boolean;
}) {
  const done = loggedToday && hasEvidence && hasStudyRow;

  return (
    <div className="card p-4 sm:p-5 border-good/30 bg-gradient-to-br from-good/10 to-bg-card">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-good font-medium">
            Today&apos;s ritual (~2 min)
          </div>
          <div className="text-base font-semibold mt-0.5">
            {done ? "You're done for today" : "Finish your daily log"}
          </div>
        </div>
        {!done && (
          <Link href="/daily/new" className="btn-primary text-sm shrink-0">
            {loggedToday ? "Finish log" : "Log now"}
          </Link>
        )}
      </div>

      <ul className="space-y-2 text-sm">
        <RitualItem done={hasEvidence} label="At least 1 photo of your work" />
        <RitualItem
          done={hasStudyRow}
          label="One chapter + topic from the syllabus"
        />
        <RitualItem done={loggedToday} label="Save the daily log" />
      </ul>

      {!done && (
        <p className="text-xs text-ink-faint mt-3 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5" />
          Camera opens on the log page — snap your notebook first.
        </p>
      )}
    </div>
  );
}

function RitualItem({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-good shrink-0" />
      ) : (
        <Circle className="w-4 h-4 text-ink-faint shrink-0" />
      )}
      <span className={done ? "text-ink-dim" : "text-ink"}>{label}</span>
    </li>
  );
}
