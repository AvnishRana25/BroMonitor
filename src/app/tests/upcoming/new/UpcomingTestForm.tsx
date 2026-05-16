"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TEST_TYPES, todayLocalInputValue } from "@/lib/utils";
import { SubjectPill } from "@/components/SubjectPill";
import { ChevronDown, ChevronRight } from "lucide-react";
import { createUpcomingTest } from "../../actions";

type Subject = {
  id: string;
  name: string;
  short: string;
  color: string;
  chapters: { id: string; name: string }[];
};

export function UpcomingTestForm({ subjects }: { subjects: Subject[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<string>("school_unit");

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [chaptersBySubject, setChaptersBySubject] = useState<
    Record<string, Set<string>>
  >({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const source =
    TEST_TYPES.find((t) => t.value === type)?.source ?? "school";

  function toggleSubject(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
    if (!expanded[id]) setExpanded((e) => ({ ...e, [id]: true }));
  }
  function toggleChapter(subjectId: string, chapterId: string) {
    setChaptersBySubject((m) => {
      const set = new Set(m[subjectId] ?? []);
      if (set.has(chapterId)) set.delete(chapterId);
      else set.add(chapterId);
      return { ...m, [subjectId]: set };
    });
  }
  function selectAllChapters(subject: Subject) {
    setChaptersBySubject((m) => ({
      ...m,
      [subject.id]: new Set(subject.chapters.map((c) => c.id)),
    }));
  }
  function clearChapters(subjectId: string) {
    setChaptersBySubject((m) => ({ ...m, [subjectId]: new Set() }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!Object.values(selected).some((v) => v)) {
      alert("Pick at least one subject for this test.");
      return;
    }
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    fd.set("source", source);
    Object.entries(selected).forEach(([id, on]) => {
      if (on) fd.set(`subject_${id}`, "on");
    });
    Object.entries(chaptersBySubject).forEach(([subjectId, chSet]) => {
      if (!selected[subjectId]) return;
      fd.delete(`chapters_${subjectId}`);
      chSet.forEach((cid) => fd.append(`chapters_${subjectId}`, cid));
    });
    await createUpcomingTest(fd);
    setSubmitting(false);
    router.push("/tests");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="card p-5">
        <div className="text-base font-semibold mb-4">Test details</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Test name</label>
            <input
              name="name"
              required
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
              defaultValue={todayLocalInputValue()}
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
            <label className="label">Max marks (optional)</label>
            <input
              name="maxMarks"
              type="number"
              step="0.25"
              min="0"
              className="input"
              placeholder="e.g. 100"
            />
          </div>
          <div>
            <label className="label">Duration in minutes (optional)</label>
            <input
              name="durationMinutes"
              type="number"
              min="0"
              className="input"
              placeholder="e.g. 180"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Preparation plan (optional)</label>
            <textarea
              name="preparation"
              rows={2}
              className="input resize-none"
              placeholder="What he needs to revise before this test."
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes (optional)</label>
            <textarea
              name="notes"
              rows={2}
              className="input resize-none"
              placeholder="Anything else you want to remember."
            />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="text-base font-semibold">Syllabus</div>
        <div className="text-xs text-ink-faint mb-4">
          Pick the subjects that are part of this test, then expand to choose
          which chapters are included.
        </div>
        <div className="space-y-2">
          {subjects.map((s) => {
            const isOn = !!selected[s.id];
            const chSet = chaptersBySubject[s.id] ?? new Set<string>();
            const open = expanded[s.id] ?? false;
            return (
              <div
                key={s.id}
                className={`border rounded-lg ${
                  isOn ? "border-accent/40 bg-accent/5" : "border-border-soft bg-bg-soft"
                }`}
              >
                <div className="flex items-center justify-between p-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => toggleSubject(s.id)}
                    />
                    <SubjectPill name={s.name} color={s.color} />
                    {isOn && (
                      <span className="text-xs text-ink-faint">
                        {chSet.size
                          ? `${chSet.size} chapter${chSet.size === 1 ? "" : "s"}`
                          : "Full syllabus"}
                      </span>
                    )}
                  </label>
                  {isOn && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectAllChapters(s)}
                        className="text-xs text-accent hover:underline"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() => clearChapters(s.id)}
                        className="text-xs text-ink-faint hover:text-ink"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((e) => ({ ...e, [s.id]: !e[s.id] }))
                        }
                        className="text-ink-faint hover:text-ink"
                      >
                        {open ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
                {isOn && open && (
                  <div className="border-t border-border-soft p-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {s.chapters.map((c) => {
                      const checked = chSet.has(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded cursor-pointer transition ${
                            checked
                              ? "bg-accent/10 text-accent"
                              : "hover:bg-bg-hover text-ink-dim"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleChapter(s.id, c.id)}
                          />
                          <span className="truncate">{c.name}</span>
                        </label>
                      );
                    })}
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
          {submitting ? "Saving…" : "Schedule test"}
        </button>
      </div>
    </form>
  );
}
