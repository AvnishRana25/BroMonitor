import Link from "next/link";
import { prisma } from "@/lib/db";
import { fmtDate, toDateInputValue } from "@/lib/utils";
import { SubjectPill } from "@/components/SubjectPill";
import { Plus, Pencil } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { DeleteDailyLogButton } from "./DeleteDailyLogButton";

export default async function DailyPage() {
  const logs = await prisma.dailyLog.findMany({
    orderBy: { date: "desc" },
    include: {
      entries: {
        include: { subject: true, chapter: true },
      },
    },
    take: 60,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-ink-dim">
          {logs.length} day{logs.length === 1 ? "" : "s"} logged
        </div>
        <Link href="/daily/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New daily log
        </Link>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          title="No daily logs yet"
          description="Log what he studied today — school hours, coaching, self-study, and chapters covered."
          action={
            <Link href="/daily/new" className="btn-primary">
              <Plus className="w-4 h-4" /> Add today's log
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const total =
              log.schoolHours + log.coachingHours + log.selfStudyHours;
            return (
              <div key={log.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-base font-semibold">
                      {fmtDate(log.date, true)}
                    </div>
                    <div className="text-xs text-ink-faint mt-0.5">
                      Total {total.toFixed(1)}h · School {log.schoolHours}h ·
                      Coach {log.coachingHours}h · Self {log.selfStudyHours}h
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/daily/new?date=${toDateInputValue(log.date)}`}
                      className="btn-ghost"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Link>
                    <DeleteDailyLogButton id={log.id} />
                  </div>
                </div>

                {log.entries.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {log.entries.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-start gap-2 text-sm bg-bg-soft border border-border-soft rounded-lg p-2.5"
                      >
                        <SubjectPill
                          name={e.subject.short}
                          color={e.subject.color}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            {e.chapter?.name ?? e.subTopic ?? "—"}
                          </div>
                          <div className="text-xs text-ink-faint mt-0.5">
                            {e.source}
                            {e.chapter && e.subTopic
                              ? ` · ${e.subTopic}`
                              : ""}
                            {e.problemsSolved
                              ? ` · ${e.problemsSolved} problems`
                              : ""}
                            {e.homeworkDone ? " · HW done" : ""}
                          </div>
                          {e.notes && (
                            <div className="text-xs text-ink-dim mt-1">
                              {e.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {log.notes && (
                  <div className="mt-3 text-sm text-ink-dim border-t border-border-soft pt-3">
                    {log.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
