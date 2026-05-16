"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TEST_TYPES, todayLocalInputValue } from "@/lib/utils";
import { SubjectPill } from "@/components/SubjectPill";
import { createTest } from "../actions";

type Subject = { id: string; name: string; short: string; color: string };

type Prefill = {
  name: string;
  date: string;
  type: string;
  maxMarksPerSubject: number | null;
  subjectIds: string[];
} | null;

export function TestForm({
  subjects,
  prefill,
}: {
  subjects: Subject[];
  prefill: Prefill;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<string>(prefill?.type ?? "coaching_weekly");

  const source =
    TEST_TYPES.find((t) => t.value === type)?.source ?? "coaching";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("source", source);

    const hasAnyMax = subjects.some((s) => {
      const max = fd.get(`max_${s.id}`);
      return max != null && max !== "" && Number(max) > 0;
    });
    if (!hasAnyMax) {
      setError(
        "Add marks for at least one subject (set a Max greater than 0)."
      );
      return;
    }

    setSubmitting(true);
    try {
      await createTest(fd);
      router.push("/tests");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong saving."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const selectedSubjectIds = prefill?.subjectIds ?? subjects.map((s) => s.id);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {prefill && (
        <div className="card p-4 border-accent/40 bg-accent/5">
          <div className="text-sm">
            Logging scores for scheduled test{" "}
            <span className="font-semibold">{prefill.name}</span>. Fill in marks
            and we'll remove it from upcoming.
          </div>
        </div>
      )}
      <div className="card p-5">
        <div className="text-base font-semibold mb-4">Test details</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Test name</label>
            <input
              name="name"
              required
              defaultValue={prefill?.name ?? ""}
              className="input"
              placeholder="e.g. Half Yearly — Physics"
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              name="date"
              required
              defaultValue={prefill?.date ?? todayLocalInputValue()}
              className="input"
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select
              name="type"
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {TEST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Rank (optional)</label>
            <input
              name="rank"
              type="number"
              min="1"
              className="input"
              placeholder="Batch / class rank"
            />
          </div>
          <div>
            <label className="label">Percentile (optional)</label>
            <input
              name="percentile"
              type="number"
              min="0"
              max="100"
              step="0.01"
              className="input"
              placeholder="e.g. 96.5"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <textarea
              name="notes"
              rows={2}
              className="input resize-none"
              placeholder="Silly mistakes, time management, what to fix..."
            />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="text-base font-semibold mb-4">Subject-wise breakdown</div>
        <div className="space-y-3">
          {subjects.map((s) => {
            const isPrefilled = selectedSubjectIds.includes(s.id);
            return (
              <div
                key={s.id}
                className={`bg-bg-soft border rounded-lg p-3 ${
                  isPrefilled ? "border-accent/30" : "border-border-soft"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <SubjectPill name={s.name} color={s.color} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="label">Marks</label>
                    <input
                      type="number"
                      step="0.25"
                      name={`marks_${s.id}`}
                      className="input py-1.5"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="label">Max</label>
                    <input
                      type="number"
                      step="0.25"
                      name={`max_${s.id}`}
                      defaultValue={
                        isPrefilled && prefill?.maxMarksPerSubject
                          ? prefill.maxMarksPerSubject
                          : ""
                      }
                      className="input py-1.5"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="label">Correct</label>
                    <input
                      type="number"
                      name={`correct_${s.id}`}
                      className="input py-1.5"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="label">Wrong</label>
                    <input
                      type="number"
                      name={`wrong_${s.id}`}
                      className="input py-1.5"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="label">Unattempted</label>
                    <input
                      type="number"
                      name={`unattempted_${s.id}`}
                      className="input py-1.5"
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-5">
                    <label className="label">Weak topics (comma separated)</label>
                    <input
                      name={`weak_${s.id}`}
                      className="input py-1.5"
                      placeholder="e.g. Friction, Pulleys"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="card p-3 border-bad/40 bg-bad/5 text-sm text-bad">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-ghost"
        >
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Saving…" : "Save test"}
        </button>
      </div>
    </form>
  );
}
