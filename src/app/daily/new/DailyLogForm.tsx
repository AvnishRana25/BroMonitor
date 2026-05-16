"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { todayLocalInputValue } from "@/lib/utils";
import { upsertDailyLog } from "../actions";
import { createChapter } from "../../subjects/actions";

type Subject = {
  id: string;
  name: string;
  short: string;
  color: string;
  chapters: { id: string; name: string }[];
};

type Entry = {
  subjectId: string;
  chapterId: string | null;
  source: string;
  subTopic: string | null;
  problemsSolved: number;
  homeworkDone: boolean;
  notes: string | null;
};

type Existing = {
  schoolHours: number;
  coachingHours: number;
  selfStudyHours: number;
  notes: string | null;
  entries: Entry[];
};

const blankEntry = (subjectId: string, source = "school"): Entry => ({
  subjectId,
  chapterId: null,
  source,
  subTopic: null,
  problemsSolved: 0,
  homeworkDone: false,
  notes: null,
});

export function DailyLogForm({
  subjects,
  defaultDate,
  existing,
}: {
  subjects: Subject[];
  defaultDate: string;
  existing: Existing | null;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>(
    existing?.entries.length
      ? existing.entries
      : [blankEntry(subjects[0]?.id ?? "")]
  );
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(defaultDate);
  const today = todayLocalInputValue();
  const isToday = date === today;

  function update(i: number, patch: Partial<Entry>) {
    setEntries((arr) =>
      arr.map((e, idx) => {
        if (idx !== i) return e;
        const next = { ...e, ...patch };
        // If subject changed, clear chapter
        if (patch.subjectId && patch.subjectId !== e.subjectId) {
          next.chapterId = null;
        }
        return next;
      })
    );
  }
  function add() {
    setEntries((arr) => [...arr, blankEntry(subjects[0]?.id ?? "", "self")]);
  }
  function remove(i: number) {
    setEntries((arr) => arr.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    entries.forEach((en, i) => {
      fd.set(`entry_${i}_subjectId`, en.subjectId);
      fd.set(`entry_${i}_chapterId`, en.chapterId ?? "");
      fd.set(`entry_${i}_source`, en.source);
      fd.set(`entry_${i}_subTopic`, en.subTopic ?? "");
      fd.set(`entry_${i}_problems`, String(en.problemsSolved || 0));
      if (en.homeworkDone) fd.set(`entry_${i}_hwDone`, "on");
      fd.set(`entry_${i}_notes`, en.notes ?? "");
    });
    await upsertDailyLog(fd);
    setSubmitting(false);
    router.push("/daily");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="card p-5">
        <div className="text-base font-semibold mb-4">Daily summary</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="label flex items-center justify-between gap-2">
              <span>Date</span>
              {isToday ? (
                <span className="chip text-[10px] py-0.5 px-2 text-good border-good/30 bg-good/10 normal-case tracking-normal">
                  Today
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setDate(today)}
                  className="text-[10px] text-accent hover:underline normal-case tracking-normal"
                >
                  Jump to today
                </button>
              )}
            </label>
            <input
              type="date"
              name="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">School hours</label>
            <input
              type="number"
              step="0.25"
              min="0"
              name="schoolHours"
              defaultValue={existing?.schoolHours ?? 0}
              className="input"
            />
          </div>
          <div>
            <label className="label">Coaching hours</label>
            <input
              type="number"
              step="0.25"
              min="0"
              name="coachingHours"
              defaultValue={existing?.coachingHours ?? 0}
              className="input"
            />
          </div>
          <div>
            <label className="label">Self-study hours</label>
            <input
              type="number"
              step="0.25"
              min="0"
              name="selfStudyHours"
              defaultValue={existing?.selfStudyHours ?? 0}
              className="input"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Notes for the day</label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={existing?.notes ?? ""}
            className="input resize-none"
            placeholder="Anything notable — fatigue, distractions, breakthroughs..."
          />
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-base font-semibold">Topics studied</div>
            <div className="text-xs text-ink-faint">
              Pick the subject, then the chapter (NCERT). Add one row per
              chapter studied.
            </div>
          </div>
          <button type="button" onClick={add} className="btn-ghost">
            <Plus className="w-4 h-4" /> Add row
          </button>
        </div>

        <div className="space-y-3">
          {entries.map((en, i) => {
            const subject =
              subjects.find((s) => s.id === en.subjectId) ?? subjects[0];
            return (
              <div
                key={i}
                className="grid grid-cols-12 gap-2 items-start bg-bg-soft border border-border-soft rounded-lg p-3"
              >
                <div className="col-span-6 sm:col-span-3">
                  <label className="label">Subject</label>
                  <select
                    className="input"
                    value={en.subjectId}
                    onChange={(e) => update(i, { subjectId: e.target.value })}
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <label className="label">Source</label>
                  <select
                    className="input"
                    value={en.source}
                    onChange={(e) => update(i, { source: e.target.value })}
                  >
                    <option value="school">School</option>
                    <option value="coaching">Coaching</option>
                    <option value="self">Self-study</option>
                  </select>
                </div>
                <div className="col-span-12 sm:col-span-7">
                  <ChapterPicker
                    subject={subject}
                    value={en.chapterId}
                    onChange={(chapterId) => update(i, { chapterId })}
                  />
                </div>

                <div className="col-span-12 sm:col-span-6">
                  <label className="label">Sub-topic (optional)</label>
                  <input
                    className="input"
                    value={en.subTopic ?? ""}
                    placeholder="e.g. Projectile motion"
                    onChange={(e) => update(i, { subTopic: e.target.value })}
                  />
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <label className="label">Problems solved</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={en.problemsSolved}
                    onChange={(e) =>
                      update(i, { problemsSolved: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="col-span-6 sm:col-span-3 flex flex-col">
                  <label className="label">Homework</label>
                  <label className="inline-flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={en.homeworkDone}
                      onChange={(e) =>
                        update(i, { homeworkDone: e.target.checked })
                      }
                    />
                    <span className="text-sm text-ink-dim">Done</span>
                  </label>
                </div>
                <div className="col-span-12">
                  <input
                    className="input"
                    placeholder="Optional notes (e.g. struggled with friction problems)"
                    value={en.notes ?? ""}
                    onChange={(e) => update(i, { notes: e.target.value })}
                  />
                </div>
                {entries.length > 1 && (
                  <div className="col-span-12 flex justify-end">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="btn-danger"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove row
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-ghost"
        >
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Saving…" : existing ? "Update log" : "Save log"}
        </button>
      </div>
    </form>
  );
}

function ChapterPicker({
  subject,
  value,
  onChange,
}: {
  subject: Subject | undefined;
  value: string | null;
  onChange: (chapterId: string | null) => void;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [pendingChapterName, setPendingChapterName] = useState<string | null>(
    null
  );
  const [pending, start] = useTransition();

  // When the chapters list refreshes after creation, auto-select the new chapter.
  useEffect(() => {
    if (!pendingChapterName || !subject) return;
    const match = subject.chapters.find((c) => c.name === pendingChapterName);
    if (match) {
      onChange(match.id);
      setPendingChapterName(null);
    }
  }, [subject, pendingChapterName, onChange]);

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    if (!subject) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setPendingChapterName(trimmed);
    setName("");
    setAdding(false);
    start(async () => {
      const created = await createChapter(subject.id, trimmed);
      if (created) {
        onChange(created.id);
        setPendingChapterName(null);
      }
      router.refresh();
    });
  }

  return (
    <div>
      <label className="label flex items-center justify-between gap-2">
        <span>Chapter</span>
        {!adding && subject && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-[10px] text-accent hover:underline normal-case tracking-normal"
          >
            + New chapter
          </button>
        )}
      </label>
      {adding ? (
        <form onSubmit={submitNew} className="flex items-center gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`New chapter for ${subject?.name ?? "subject"}`}
            className="input flex-1"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setAdding(false);
                setName("");
              }
            }}
          />
          <button
            type="submit"
            disabled={pending || !name.trim()}
            className="btn-primary py-2 px-3 text-xs"
          >
            {pending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              "Add"
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setName("");
            }}
            className="btn-ghost py-2 px-2"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <div className="relative">
          <select
            className="input"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={pending}
          >
            <option value="">— Select chapter —</option>
            {subject?.chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {pending && (
            <Loader2 className="w-4 h-4 animate-spin text-ink-faint absolute right-9 top-1/2 -translate-y-1/2" />
          )}
        </div>
      )}
    </div>
  );
}
