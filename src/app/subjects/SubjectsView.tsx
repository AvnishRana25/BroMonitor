"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Loader2, Plus, Trash2, X } from "lucide-react";
import { TOPIC_STATUSES, avgProgressPct, cn, topicPct } from "@/lib/utils";
import {
  createChapter,
  createTopic,
  deleteChapter,
  deleteTopic,
  updateTopic,
} from "./actions";

type Topic = {
  id: string;
  name: string;
  status: string;
  confidence: number;
  problemsSolved: number;
};

type Chapter = {
  id: string;
  name: string;
  order: number;
  topics: Topic[];
};

type Subject = {
  id: string;
  name: string;
  short: string;
  color: string;
  chapters: Chapter[];
};

const STATUS_COLOR: Record<string, string> = Object.fromEntries(
  TOPIC_STATUSES.map((s) => [s.value, s.color])
);

export function SubjectsView({
  subjects,
  initialSubjectId,
}: {
  subjects: Subject[];
  initialSubjectId?: string;
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string>(
    initialSubjectId ?? subjects[0]?.id ?? ""
  );
  const active = subjects.find((s) => s.id === activeId) ?? subjects[0];

  // Keep the URL in sync so a refresh keeps the same subject tab.
  useEffect(() => {
    if (!active) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("s") === active.id) return;
    params.set("s", active.id);
    router.replace(`/subjects?${params.toString()}`, { scroll: false });
  }, [active, router]);

  const stats = useMemo(() => {
    const all = active?.chapters.flatMap((c) => c.topics) ?? [];
    const mastered = all.filter((t) => t.status === "mastered").length;
    const notStarted = all.filter((t) => t.status === "not_started").length;
    const inProgress = all.length - mastered - notStarted;
    return {
      total: all.length,
      mastered,
      notStarted,
      inProgress,
      avgPct: avgProgressPct(all),
    };
  }, [active]);

  if (!active) {
    return (
      <div className="text-sm text-ink-faint">
        No subjects seeded. Run <code>npm run db:seed</code>.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Subject tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveId(s.id)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm border transition",
              s.id === activeId
                ? "border-transparent text-white"
                : "border-border bg-bg-soft text-ink-dim hover:text-ink"
            )}
            style={
              s.id === activeId
                ? {
                    background: `${s.color}30`,
                    borderColor: `${s.color}80`,
                    color: s.color,
                  }
                : undefined
            }
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryStat label="Total topics" value={stats.total} />
        <SummaryStat
          label="Avg progress"
          value={`${stats.avgPct}%`}
          tone={
            stats.avgPct >= 80
              ? "good"
              : stats.avgPct >= 40
              ? "warn"
              : "default"
          }
          color={active.color}
        />
        <SummaryStat label="Mastered" value={stats.mastered} tone="good" />
        <SummaryStat label="Not started" value={stats.notStarted} />
      </div>

      {/* Status legend */}
      <div className="card p-3">
        <div className="text-[11px] uppercase tracking-wide text-ink-faint mb-2">
          Status weights
        </div>
        <div className="flex flex-wrap gap-2">
          {TOPIC_STATUSES.map((s) => (
            <span
              key={s.value}
              className="chip text-xs"
              style={{
                background: `${s.color}1a`,
                borderColor: `${s.color}55`,
                color: s.color,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: s.color }}
              />
              {s.label} · {s.pct}%
            </span>
          ))}
        </div>
      </div>

      {/* Chapters */}
      <div className="space-y-3">
        {active.chapters.map((chapter) => (
          <ChapterRow
            key={chapter.id}
            chapter={chapter}
            subjectColor={active.color}
          />
        ))}
        <AddChapterForm subjectId={active.id} />
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone = "default",
  color,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "good" | "warn";
  color?: string;
}) {
  const toneCls = {
    default: "text-ink",
    good: "text-good",
    warn: "text-warn",
  }[tone];
  return (
    <div className="card p-4">
      <div className="text-xs text-ink-dim uppercase tracking-wide">{label}</div>
      <div
        className={cn("stat-num mt-1", toneCls)}
        style={tone === "default" && color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function ChapterRow({
  chapter,
  subjectColor,
}: {
  chapter: Chapter;
  subjectColor: string;
}) {
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [, startTransition] = useTransition();
  const completion = avgProgressPct(chapter.topics);
  const total = chapter.topics.length;
  const mastered = chapter.topics.filter((t) => t.status === "mastered").length;
  const notStarted = chapter.topics.filter(
    (t) => t.status === "not_started"
  ).length;
  const inProgress = total - mastered - notStarted;

  function removeChapter(e: React.MouseEvent) {
    e.stopPropagation();
    if (
      !confirm(
        `Delete chapter "${chapter.name}"? Its ${total} topic${
          total === 1 ? "" : "s"
        } will be removed. Past daily-log entries are kept, but they will no longer reference this chapter.`
      )
    )
      return;
    setRemoving(true);
    startTransition(() => {
      void deleteChapter(chapter.id);
    });
  }

  return (
    <div
      className={cn(
        "card overflow-hidden transition-opacity",
        removing && "opacity-40 pointer-events-none"
      )}
    >
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex-1 flex items-center gap-3 p-4 text-left hover:bg-bg-hover transition min-w-0"
        >
          {open ? (
            <ChevronDown className="w-4 h-4 text-ink-faint shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-ink-faint shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium break-words">{chapter.name}</div>
            <div className="text-xs text-ink-faint mt-1">
              {total} topic{total === 1 ? "" : "s"} ·{" "}
              {mastered} mastered · {inProgress} in progress · {notStarted} not started
            </div>
          </div>
          <div className="w-32 hidden sm:block shrink-0">
            <div
              className="text-right text-xs mb-1"
              style={{ color: subjectColor }}
            >
              {completion}%
            </div>
            <div className="w-full h-1.5 rounded-full bg-bg-soft overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${completion}%`, background: subjectColor }}
              />
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={removeChapter}
          disabled={removing}
          className="px-3 text-ink-faint hover:text-bad hover:bg-bad/5 border-l border-border-soft transition"
          title="Delete chapter"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <div className="border-t border-border-soft p-4 space-y-3">
          {chapter.topics.length === 0 && (
            <div className="text-sm text-ink-faint italic">
              No topics yet — add the first one below.
            </div>
          )}
          {chapter.topics.map((t) => (
            <TopicRow key={t.id} topic={t} />
          ))}
          <AddTopicForm chapterId={chapter.id} />
        </div>
      )}
    </div>
  );
}

function TopicRow({ topic }: { topic: Topic }) {
  const [pending, startTransition] = useTransition();
  const [t, setT] = useState(topic);
  const [removing, setRemoving] = useState(false);

  function patch(p: Partial<Topic>) {
    const next = { ...t, ...p };
    setT(next);
    startTransition(() => {
      void updateTopic(t.id, p);
    });
  }

  function remove() {
    if (!confirm(`Delete topic "${t.name}"? This cannot be undone.`)) return;
    setRemoving(true);
    startTransition(() => {
      void deleteTopic(t.id);
    });
  }

  const pct = topicPct(t.status);
  const color = STATUS_COLOR[t.status] ?? "#3b3f4d";

  return (
    <div
      className={cn(
        "bg-bg-soft border border-border-soft rounded-lg p-3 space-y-3 transition-opacity",
        removing && "opacity-40"
      )}
    >
      {/* Row 1: name (full width, wraps) + delete */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <div
            className="w-2 h-2 rounded-full mt-1.5 shrink-0"
            style={{ background: color }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm leading-snug break-words">{t.name}</div>
            <div className="text-[11px] text-ink-faint mt-0.5">
              Progress: <span style={{ color }}>{pct}%</span>
              {pending && (
                <Loader2 className="w-3 h-3 animate-spin inline ml-2 text-ink-faint" />
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={removing}
          className="text-ink-faint hover:text-bad p-1 rounded transition"
          title="Delete topic"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Row 2: controls with explicit headings */}
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <Field label="Status">
          <select
            className="input py-1.5 text-xs min-w-[150px]"
            title="Topic status"
            value={t.status}
            onChange={(e) => patch({ status: e.target.value })}
          >
            {TOPIC_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label} · {s.pct}%
              </option>
            ))}
          </select>
        </Field>
        <Field label="Confidence">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() =>
                  patch({ confidence: t.confidence === n ? 0 : n })
                }
                className={cn(
                  "w-7 h-7 rounded-full text-[11px] border transition",
                  t.confidence >= n
                    ? "bg-accent/30 border-accent text-accent"
                    : "border-border text-ink-faint hover:border-ink-dim"
                )}
                title={`Confidence ${n}/5`}
              >
                {n}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Problems solved">
          <input
            type="number"
            min="0"
            title="Problems solved"
            className="input py-1.5 text-xs w-24"
            value={t.problemsSolved}
            onChange={(e) =>
              patch({ problemsSolved: Number(e.target.value) || 0 })
            }
          />
        </Field>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium text-ink-faint uppercase tracking-wide">
        {label}
      </span>
      {children}
    </label>
  );
}

function AddTopicForm({ chapterId }: { chapterId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    start(() => {
      void createTopic(chapterId, trimmed);
    });
    setName("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost w-full justify-start text-ink-dim hover:text-ink"
      >
        <Plus className="w-4 h-4" /> Add topic
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 bg-bg border border-accent/40 rounded-lg p-2"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New topic name…"
        className="input flex-1 py-1.5"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setName("");
          }
        }}
      />
      <button
        type="submit"
        disabled={pending || !name.trim()}
        className="btn-primary py-1.5 px-3"
      >
        {pending ? "Adding…" : "Add"}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setName("");
        }}
        className="btn-ghost py-1.5 px-2"
        title="Cancel"
      >
        <X className="w-4 h-4" />
      </button>
    </form>
  );
}

function AddChapterForm({ subjectId }: { subjectId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    start(() => {
      void createChapter(subjectId, trimmed);
    });
    setName("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost w-full justify-start text-ink-dim hover:text-ink border border-dashed border-border-soft rounded-xl p-4"
      >
        <Plus className="w-4 h-4" /> Add chapter
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="card p-3 flex flex-col sm:flex-row sm:items-center gap-2 border-accent/40"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New chapter name..."
        className="input flex-1"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setName("");
          }
        }}
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="btn-primary"
        >
          {pending ? "Adding..." : "Add chapter"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setName("");
          }}
          className="btn-ghost px-2"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
