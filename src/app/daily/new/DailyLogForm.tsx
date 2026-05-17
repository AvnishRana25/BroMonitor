"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Plus, Trash2, X } from "lucide-react";
import { todayLocalInputValue } from "@/lib/utils";
import { validateDailyRitual } from "@/lib/dailyRitual";
import { upsertDailyLog } from "../actions";
import { createChapter } from "../../subjects/actions";
import {
  DailyEvidenceCapture,
  type ExistingPhoto,
} from "@/components/DailyEvidenceCapture";
import { SmartLogPaste } from "@/components/SmartLogPaste";
import type { ParsedLog } from "@/lib/ai/parseLog";

type TopicOpt = { id: string; name: string };
type ChapterOpt = { id: string; name: string; topics: TopicOpt[] };

type Subject = {
  id: string;
  name: string;
  short: string;
  color: string;
  chapters: ChapterOpt[];
};

type Entry = {
  subjectId: string;
  chapterId: string | null;
  topicId: string | null;
  source: string;
  subTopic: string | null;
  problemsSolved: number;
  homeworkDone: boolean;
  notes: string | null;
};

const OTHER_TOPIC = "__other__";

function resolveTopicId(
  chapter: ChapterOpt | undefined,
  subTopic: string | null,
): string | null {
  if (!chapter || !subTopic?.trim()) return null;
  const match = chapter.topics.find((t) => t.name === subTopic.trim());
  return match?.id ?? OTHER_TOPIC;
}

function entryFromExisting(e: ExistingEntry, subjects: Subject[]): Entry {
  const sub = subjects.find((s) => s.id === e.subjectId);
  const ch = sub?.chapters.find((c) => c.id === e.chapterId);
  return {
    ...e,
    topicId: e.topicId ?? resolveTopicId(ch, e.subTopic),
  };
}

type Reflection = {
  learned: string | null;
  confused: string | null;
  hardestSolved: string | null;
};

type ExistingEntry = Omit<Entry, "topicId"> & { topicId?: string | null };

type Existing = {
  schoolHours: number;
  coachingHours: number;
  selfStudyHours: number;
  sleepHours: number | null;
  energy: number | null;
  notes: string | null;
  entries: ExistingEntry[];
  reflection: Reflection | null;
};

const blankEntry = (subjectId: string, source = "school"): Entry => ({
  subjectId,
  chapterId: null,
  topicId: null,
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
  existingPhotos = [],
  initialDailyLogId = null,
  canUploadEvidence = true,
  canDeleteEvidence = false,
  isEditing = false,
  suggestedBackfill = false,
  allRecentFilled = false,
}: {
  subjects: Subject[];
  defaultDate: string;
  existing: Existing | null;
  existingPhotos?: ExistingPhoto[];
  initialDailyLogId?: string | null;
  canUploadEvidence?: boolean;
  canDeleteEvidence?: boolean;
  isEditing?: boolean;
  suggestedBackfill?: boolean;
  allRecentFilled?: boolean;
}) {
  const router = useRouter();
  const [dailyLogId, setDailyLogId] = useState<string | null>(initialDailyLogId);
  const [photos, setPhotos] = useState(existingPhotos);
  const [entries, setEntries] = useState<Entry[]>(
    existing?.entries.length
      ? existing.entries.map((e) => entryFromExisting(e, subjects))
      : [blankEntry(subjects[0]?.id ?? "")],
  );
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(defaultDate);
  const [energy, setEnergy] = useState<number>(existing?.energy ?? 0);
  const today = todayLocalInputValue();
  const isToday = date === today;
  const [showOptional, setShowOptional] = useState(!!existing);
  const [formError, setFormError] = useState<string | null>(null);

  // Controlled values so the smart-paste flow (or manual edits) can update them.
  const [schoolHours, setSchoolHours] = useState<string>(
    String(existing?.schoolHours ?? 0),
  );
  const [coachingHours, setCoachingHours] = useState<string>(
    String(existing?.coachingHours ?? 0),
  );
  const [selfStudyHours, setSelfStudyHours] = useState<string>(
    String(existing?.selfStudyHours ?? 0),
  );
  const [sleepHoursStr, setSleepHoursStr] = useState<string>(
    existing?.sleepHours == null ? "" : String(existing.sleepHours),
  );
  const [notes, setNotes] = useState<string>(existing?.notes ?? "");
  const [refLearned, setRefLearned] = useState<string>(
    existing?.reflection?.learned ?? "",
  );
  const [refConfused, setRefConfused] = useState<string>(
    existing?.reflection?.confused ?? "",
  );
  const [refHardest, setRefHardest] = useState<string>(
    existing?.reflection?.hardestSolved ?? "",
  );
  const [parsedSummary, setParsedSummary] = useState<{
    addedRows: number;
    unmatched: string[];
  } | null>(null);

  function applyParsedLog(parsed: ParsedLog) {
    if (parsed.schoolHours > 0) setSchoolHours(String(parsed.schoolHours));
    if (parsed.coachingHours > 0)
      setCoachingHours(String(parsed.coachingHours));
    if (parsed.selfStudyHours > 0)
      setSelfStudyHours(String(parsed.selfStudyHours));
    if (parsed.sleepHours != null) setSleepHoursStr(String(parsed.sleepHours));
    if (parsed.energy != null) setEnergy(parsed.energy);
    if (parsed.notes) setNotes(parsed.notes);
    if (parsed.reflection.learned) setRefLearned(parsed.reflection.learned);
    if (parsed.reflection.confused) setRefConfused(parsed.reflection.confused);
    if (parsed.reflection.hardestSolved)
      setRefHardest(parsed.reflection.hardestSolved);

    if (parsed.entries.length > 0) {
      const newRows: Entry[] = parsed.entries.map((p) => ({
        subjectId: p.subjectId,
        chapterId: p.chapterId,
        topicId: p.topicId ?? (p.topicName ? OTHER_TOPIC : null),
        source: p.source,
        subTopic: p.topicName,
        problemsSolved: p.problemsSolved,
        homeworkDone: p.homeworkDone,
        notes: p.notes,
      }));
      // If the existing entries are still blank (default) replace; else append.
      setEntries((cur) => {
        const allBlank = cur.every(
          (e) => !e.chapterId && !e.topicId && !e.subTopic,
        );
        return allBlank ? newRows : [...cur, ...newRows];
      });
    }

    setShowOptional(true);
    setParsedSummary({
      addedRows: parsed.entries.length,
      unmatched: parsed.unmatched,
    });
  }

  const photoCount = photos.length;

  function update(i: number, patch: Partial<Entry>) {
    setEntries((arr) =>
      arr.map((e, idx) => {
        if (idx !== i) return e;
        const next = { ...e, ...patch };
        // If subject changed, clear chapter
        if (patch.subjectId && patch.subjectId !== e.subjectId) {
          next.chapterId = null;
          next.topicId = null;
          next.subTopic = null;
        }
        if (patch.chapterId !== undefined && patch.chapterId !== e.chapterId) {
          next.topicId = null;
          next.subTopic = null;
        }
        if (patch.topicId !== undefined) {
          const sub = subjects.find((s) => s.id === next.subjectId);
          const ch = sub?.chapters.find((c) => c.id === next.chapterId);
          if (patch.topicId && patch.topicId !== OTHER_TOPIC) {
            const topic = ch?.topics.find((t) => t.id === patch.topicId);
            next.subTopic = topic?.name ?? next.subTopic;
          } else if (patch.topicId === null) {
            next.subTopic = null;
          }
        }
        return next;
      }),
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
    setFormError(null);
    const err = validateDailyRitual(entries, photoCount);
    if (err) {
      setFormError(err);
      return;
    }
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    fd.set("pendingPhotoCount", String(photoCount));
    entries.forEach((en, i) => {
      fd.set(`entry_${i}_subjectId`, en.subjectId);
      fd.set(`entry_${i}_chapterId`, en.chapterId ?? "");
      fd.set(`entry_${i}_topicId`, en.topicId ?? "");
      fd.set(`entry_${i}_source`, en.source);
      fd.set(`entry_${i}_subTopic`, en.subTopic ?? "");
      fd.set(`entry_${i}_problems`, String(en.problemsSolved || 0));
      if (en.homeworkDone) fd.set(`entry_${i}_hwDone`, "on");
      fd.set(`entry_${i}_notes`, en.notes ?? "");
    });
    let result;
    try {
      result = await upsertDailyLog(fd);
    } catch (e) {
      setSubmitting(false);
      setFormError(e instanceof Error ? e.message : "Could not save log.");
      return;
    }
    setSubmitting(false);
    router.push("/daily");
    router.refresh();
  }

  function onDateChange(next: string) {
    setDate(next);
    router.push(`/daily/new?date=${next}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 pb-24 md:pb-0">
      {suggestedBackfill && (
        <p className="text-sm text-accent bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
          Today is already logged. This form opens the most recent day without
          a log — change the date below to log a different day.
        </p>
      )}
      {allRecentFilled && (
        <p className="text-sm text-warn bg-warn/10 border border-warn/30 rounded-lg px-3 py-2">
          The last 30 days all have logs. Pick a date below to edit an existing
          log, or add a new entry for today.
        </p>
      )}
      <div className="card p-4 sm:p-5 border-accent/25 bg-accent/5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="text-base font-semibold">
              {isEditing ? "Edit daily log" : "New daily log"}
              {!isToday && (
                <span className="text-xs font-normal text-ink-faint ml-2">
                  (~2 min)
                </span>
              )}
            </div>
            <p className="text-xs text-ink-faint mt-0.5">
              {isEditing
                ? "Update this day’s study record, photos, and reflection."
                : "Required: photo + one chapter/topic. Hours and reflection are optional."}
            </p>
          </div>
          <div className="w-full sm:w-auto">
            <label className="label">Date</label>
            <input
              type="date"
              name="date"
              required
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="input"
            />
          </div>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm">
          <RitualCheck done={photoCount > 0} label="Photo evidence" />
          <RitualCheck
            done={entries.some(
              (e) =>
                !!e.chapterId &&
                (!!e.topicId ||
                  (e.topicId === OTHER_TOPIC && !!e.subTopic?.trim())),
            )}
            label="Chapter + topic"
          />
        </ul>
        <div className="mt-3">
          <SmartLogPaste onParsed={applyParsedLog} />
        </div>
        {parsedSummary && (
          <div className="mt-2 text-xs text-ink-dim bg-bg-soft border border-border-soft rounded-lg px-2.5 py-1.5">
            AI added {parsedSummary.addedRows} row
            {parsedSummary.addedRows === 1 ? "" : "s"}. Review and edit before
            saving.
            {parsedSummary.unmatched.length > 0 && (
              <div className="text-warn mt-1">
                Could not match: {parsedSummary.unmatched.join(", ")}
              </div>
            )}
          </div>
        )}
        {formError && (
          <p className="mt-3 text-sm text-bad bg-bad/10 border border-bad/30 rounded-lg px-3 py-2">
            {formError}
          </p>
        )}
      </div>

      {(canUploadEvidence || photos.length > 0) && (
        <DailyEvidenceCapture
          existingPhotos={photos}
          logDate={date}
          dailyLogId={dailyLogId}
          onLogId={setDailyLogId}
          onPhotosChange={setPhotos}
          canUpload={canUploadEvidence}
          canDeleteExisting={canDeleteEvidence}
        />
      )}

      <details className="card p-4 sm:p-5" open={showOptional}>
        <summary className="cursor-pointer text-sm font-semibold">
          Optional: hours, sleep, energy, notes, reflection
        </summary>
        <div className="mt-4 space-y-5">
          <div className="text-sm font-semibold">Hours & wellbeing</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">School hours</label>
              <input
                type="number"
                step="0.25"
                min="0"
                name="schoolHours"
                value={schoolHours}
                onChange={(e) => setSchoolHours(e.target.value)}
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
                value={coachingHours}
                onChange={(e) => setCoachingHours(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label flex items-center justify-between gap-2">
                <span>Self-study hours</span>
                <span className="text-[10px] text-ink-faint normal-case tracking-normal">
                  self-reported
                </span>
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                name="selfStudyHours"
                value={selfStudyHours}
                onChange={(e) => setSelfStudyHours(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Sleep last night</label>
              <input
                type="number"
                step="0.25"
                min="0"
                max="14"
                name="sleepHours"
                value={sleepHoursStr}
                onChange={(e) => setSleepHoursStr(e.target.value)}
                className="input"
                placeholder="hours"
              />
            </div>
            <div className="col-span-1 sm:col-span-1">
              <label className="label flex items-center justify-between gap-2">
                <span>Energy today</span>
                <span className="text-[10px] text-ink-faint normal-case tracking-normal">
                  {energy ? `${energy} / 5` : "not rated"}
                </span>
              </label>
              <div className="flex items-center gap-1.5 mt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEnergy(energy === n ? 0 : n)}
                    className={
                      "flex-1 py-2 rounded-lg border text-sm transition " +
                      (energy >= n && energy > 0
                        ? "bg-accent/20 border-accent/50 text-accent"
                        : "bg-bg-soft border-border text-ink-faint hover:text-ink")
                    }
                    aria-label={`Energy ${n} out of 5`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <input type="hidden" name="energy" value={energy || ""} />
            </div>
          </div>

          <div className="mt-4">
            <label className="label">Notes for the day</label>
            <textarea
              name="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input resize-none"
              placeholder="Anything notable — fatigue, distractions, breakthroughs..."
            />
          </div>

          <div className="pt-4 border-t border-border-soft space-y-3">
            <div>
              <div className="text-sm font-semibold">What I learned today</div>
              <p className="text-xs text-ink-faint mt-0.5">
                Optional — skip any field that doesn&apos;t apply.
              </p>
            </div>
            <div>
              <label className="label">Concepts learned</label>
              <textarea
                name="ref_learned"
                rows={2}
                value={refLearned}
                onChange={(e) => setRefLearned(e.target.value)}
                className="input resize-none"
                placeholder="e.g. derived projectile range, finally got why pH = -log[H+]..."
              />
            </div>
            <div>
              <label className="label">Confusion points</label>
              <textarea
                name="ref_confused"
                rows={2}
                value={refConfused}
                onChange={(e) => setRefConfused(e.target.value)}
                className="input resize-none"
                placeholder="e.g. still shaky on dimensional analysis with logs"
              />
            </div>
            <div>
              <label className="label">Hardest problem solved</label>
              <textarea
                name="ref_hardest"
                rows={2}
                value={refHardest}
                onChange={(e) => setRefHardest(e.target.value)}
                className="input resize-none"
                placeholder="e.g. HC Verma Ch 3 Q23 — pulley + friction"
              />
            </div>
          </div>
        </div>
      </details>

      <div className="card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
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
                <div className="col-span-12">
                  <StudyScopePicker
                    subject={subject}
                    chapterId={en.chapterId}
                    topicId={en.topicId}
                    subTopic={en.subTopic}
                    onChapterChange={(chapterId) => update(i, { chapterId })}
                    onTopicChange={(topicId) => update(i, { topicId })}
                    onSubTopicChange={(subTopic) =>
                      update(i, { subTopic, topicId: OTHER_TOPIC })
                    }
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

      <div className="fixed md:relative bottom-0 inset-x-0 z-20 md:z-auto border-t md:border-0 border-border bg-bg-soft/95 backdrop-blur px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom)+3.5rem)] md:pb-0 md:px-0 md:bg-transparent md:backdrop-blur-none flex items-center justify-end gap-2 max-w-3xl mx-auto md:max-w-none">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-ghost min-h-[44px]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary min-h-[44px] flex-1 md:flex-none max-w-[220px]"
        >
          {submitting ? "Saving…" : existing ? "Update log" : "Save log"}
        </button>
      </div>
    </form>
  );
}

function StudyScopePicker({
  subject,
  chapterId,
  topicId,
  subTopic,
  onChapterChange,
  onTopicChange,
  onSubTopicChange,
}: {
  subject: Subject | undefined;
  chapterId: string | null;
  topicId: string | null;
  subTopic: string | null;
  onChapterChange: (chapterId: string | null) => void;
  onTopicChange: (topicId: string | null) => void;
  onSubTopicChange: (subTopic: string) => void;
}) {
  const chapter = subject?.chapters.find((c) => c.id === chapterId);
  const topics = chapter?.topics ?? [];
  const showOther =
    topicId === OTHER_TOPIC || (topics.length === 0 && !!chapterId);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <ChapterPicker
        subject={subject}
        value={chapterId}
        onChange={onChapterChange}
      />
      <div>
        <label className="label">Topic (NCERT)</label>
        <select
          className="input"
          value={topicId ?? ""}
          disabled={!chapterId}
          onChange={(e) => {
            const v = e.target.value || null;
            onTopicChange(v);
          }}
        >
          <option value="">
            {chapterId ? "— Select topic —" : "— Pick chapter first —"}
          </option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
          <option value={OTHER_TOPIC}>Other (type below)</option>
        </select>
        {showOther && (
          <input
            className="input mt-2"
            value={subTopic ?? ""}
            placeholder="e.g. specific exercise set"
            onChange={(e) => onSubTopicChange(e.target.value)}
          />
        )}
      </div>
    </div>
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
    null,
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
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
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

function RitualCheck({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <CheckCircle2
        className={
          "w-4 h-4 shrink-0 " + (done ? "text-good" : "text-ink-faint")
        }
      />
      <span className={done ? "text-ink-dim" : ""}>{label}</span>
    </li>
  );
}
