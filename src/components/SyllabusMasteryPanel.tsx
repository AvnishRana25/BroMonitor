"use client";

import Link from "next/link";
import { TOPIC_STATUSES } from "@/lib/utils";
import { SubjectPill } from "@/components/SubjectPill";
import { ChevronRight } from "lucide-react";

export type SubjectMasteryData = {
  id: string;
  name: string;
  short: string;
  color: string;
  pct: number;
  totalTopics: number;
  startedTopics: number;
  masteredTopics: number;
  statusCounts: Record<string, number>;
};

export function SyllabusMasteryPanel({
  subjects,
  totalTopics,
  startedTopics,
  masteredTopics,
}: {
  subjects: SubjectMasteryData[];
  totalTopics: number;
  startedTopics: number;
  masteredTopics: number;
}) {
  const overallPct =
    totalTopics > 0 ? Math.round((masteredTopics / totalTopics) * 100) : 0;
  const startedPct =
    totalTopics > 0 ? Math.round((startedTopics / totalTopics) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <StatBox label="Started" value={`${startedPct}%`} sub={`${startedTopics} topics`} />
        <StatBox label="Mastered" value={`${overallPct}%`} sub={`${masteredTopics} topics`} tone="good" />
        <StatBox label="Total" value={String(totalTopics)} sub="NCERT topics" />
      </div>

      <div className="space-y-4">
        {subjects.map((sub) => (
          <Link
            key={sub.id}
            href={`/subjects?s=${sub.id}`}
            className="block rounded-lg border border-border-soft bg-bg-soft p-3 hover:border-accent/40 transition"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <SubjectPill name={sub.name} color={sub.color} />
              <span className="text-sm font-semibold">{sub.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-bg overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${sub.pct}%`, background: sub.color }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-ink-faint">
              <span>
                {sub.startedTopics}/{sub.totalTopics} started · {sub.masteredTopics} mastered
              </span>
              <span className="flex items-center gap-0.5 text-accent">
                View <ChevronRight className="w-3 h-3" />
              </span>
            </div>
            {sub.totalTopics > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {TOPIC_STATUSES.filter((s) => s.value !== "not_started").map(
                  (st) => {
                    const n = sub.statusCounts[st.value] ?? 0;
                    if (!n) return null;
                    return (
                      <span
                        key={st.value}
                        className="text-[10px] px-1.5 py-0.5 rounded border border-border-soft"
                        style={{ color: st.color }}
                      >
                        {st.label.split(" ")[0]} {n}
                      </span>
                    );
                  }
                )}
              </div>
            )}
          </Link>
        ))}
      </div>

      <Link
        href="/subjects"
        className="block text-center text-xs text-accent hover:underline py-1"
      >
        Open full syllabus →
      </Link>
    </div>
  );
}

function StatBox({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "good";
}) {
  return (
    <div className="rounded-lg bg-bg-soft border border-border-soft py-2 px-1">
      <div className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div
        className={
          "text-lg font-semibold mt-0.5 " + (tone === "good" ? "text-good" : "")
        }
      >
        {value}
      </div>
      <div className="text-[10px] text-ink-faint mt-0.5">{sub}</div>
    </div>
  );
}
