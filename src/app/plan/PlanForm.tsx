"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { upsertStudyPlan } from "./actions";

type Subject = {
  id: string;
  name: string;
  short: string;
  color: string;
};

export type ExistingPlan = {
  totalHoursGoal: number | null;
  testsGoal: number;
  revisionSessionsGoal: number;
  notes: string | null;
  byId: Record<string, number>;
};

export function PlanForm({
  subjects,
  weekStartValue,
  weekLabel,
  existing,
  copyFromPrev = null,
}: {
  subjects: Subject[];
  weekStartValue: string; // YYYY-MM-DD of Monday
  weekLabel: string;
  existing: ExistingPlan | null;
  copyFromPrev?: ExistingPlan | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const seed = existing ?? copyFromPrev;

  const [bySubject, setBySubject] = useState<Record<string, number>>(
    Object.fromEntries(
      subjects.map((s) => [s.id, seed?.byId[s.id] ?? 0])
    )
  );
  const [totalGoal, setTotalGoal] = useState<string>(
    seed?.totalHoursGoal != null ? String(seed.totalHoursGoal) : "",
  );
  const [testsGoal, setTestsGoal] = useState(String(seed?.testsGoal ?? 0));
  const [revisionGoal, setRevisionGoal] = useState(
    String(seed?.revisionSessionsGoal ?? 0),
  );
  const [planNotes, setPlanNotes] = useState(seed?.notes ?? "");
  const subtotal = Object.values(bySubject).reduce((a, b) => a + (b || 0), 0);

  function applyCopyFromPrev() {
    if (!copyFromPrev) return;
    setBySubject(
      Object.fromEntries(
        subjects.map((s) => [s.id, copyFromPrev.byId[s.id] ?? 0]),
      ),
    );
    setTotalGoal(
      copyFromPrev.totalHoursGoal != null
        ? String(copyFromPrev.totalHoursGoal)
        : "",
    );
    setTestsGoal(String(copyFromPrev.testsGoal));
    setRevisionGoal(String(copyFromPrev.revisionSessionsGoal));
    setPlanNotes(copyFromPrev.notes ?? "");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    fd.set("weekStart", weekStartValue);
    for (const [id, hours] of Object.entries(bySubject)) {
      fd.set(`subject_${id}`, String(hours));
    }
    await upsertStudyPlan(fd);
    setSubmitting(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="card p-5">
        <div className="flex items-baseline justify-between">
          <div className="text-base font-semibold">Weekly plan</div>
          <div className="text-xs text-ink-faint">{weekLabel}</div>
        </div>
        <div className="text-xs text-ink-faint mt-1">
          Per-subject targets are compared to total logged hours (school +
          coaching + self-study). The &quot;behind plan&quot; alert fires when
          pace drops below 70% of the pro-rated week goal.
        </div>
        {!existing && copyFromPrev && (
          <button
            type="button"
            onClick={applyCopyFromPrev}
            className="btn-ghost text-xs mt-3"
          >
            Copy last week&apos;s targets
          </button>
        )}
      </div>

      <div className="card p-5">
        <div className="text-base font-semibold mb-3">
          Subject hours
          <span className="text-xs text-ink-faint font-normal ml-2">
            subtotal {subtotal}h
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {subjects.map((s) => (
            <div key={s.id}>
              <label className="label flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: s.color }}
                />
                {s.name}
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="input"
                value={bySubject[s.id] ?? 0}
                onChange={(e) =>
                  setBySubject((prev) => ({
                    ...prev,
                    [s.id]: Number(e.target.value),
                  }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="text-base font-semibold mb-3">Other targets</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Total hours goal (optional)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              name="totalHoursGoal"
              value={totalGoal}
              onChange={(e) => setTotalGoal(e.target.value)}
              placeholder={String(subtotal)}
              className="input"
            />
            <div className="text-[10px] text-ink-faint mt-1">
              If blank, uses subject subtotal ({subtotal}h).
            </div>
          </div>
          <div>
            <label className="label">Tests to attempt</label>
            <input
              type="number"
              min="0"
              name="testsGoal"
              value={testsGoal}
              onChange={(e) => setTestsGoal(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Revision sessions</label>
            <input
              type="number"
              min="0"
              name="revisionSessionsGoal"
              value={revisionGoal}
              onChange={(e) => setRevisionGoal(e.target.value)}
              className="input"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Notes</label>
          <textarea
            name="notes"
            rows={2}
            value={planNotes}
            onChange={(e) => setPlanNotes(e.target.value)}
            className="input resize-none"
            placeholder="e.g. focus on rotational dynamics + organic chemistry naming"
          />
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary"
        >
          <Save className="w-4 h-4" />
          {submitting ? "Saving…" : existing ? "Update plan" : "Save plan"}
        </button>
      </div>
    </form>
  );
}
