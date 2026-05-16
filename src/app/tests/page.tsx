import Link from "next/link";
import { prisma } from "@/lib/db";
import { fmtDate, pct, startOfDay, TEST_TYPES } from "@/lib/utils";
import { Plus, Trophy, CalendarPlus, CalendarClock } from "lucide-react";
import { SubjectPill } from "@/components/SubjectPill";
import { EmptyState } from "@/components/EmptyState";
import { DeleteTestButton } from "./DeleteTestButton";
import { DeleteUpcomingTestButton } from "./DeleteUpcomingTestButton";

export default async function TestsPage() {
  const today = startOfDay(new Date());

  const [tests, upcoming] = await Promise.all([
    prisma.test.findMany({
      orderBy: { date: "desc" },
      include: { scores: { include: { subject: true } } },
    }),
    prisma.upcomingTest.findMany({
      where: { date: { gte: today } },
      orderBy: { date: "asc" },
      include: { subjects: { include: { subject: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-ink-dim">
          {tests.length} past · {upcoming.length} upcoming
        </div>
        <div className="flex items-center gap-2">
          <Link href="/tests/upcoming/new" className="btn-ghost">
            <CalendarPlus className="w-4 h-4" /> Schedule upcoming test
          </Link>
          <Link href="/tests/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Log a test
          </Link>
        </div>
      </div>

      {/* Upcoming */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-dim">
            Upcoming
          </h2>
        </div>
        {upcoming.length === 0 ? (
          <div className="card p-5 text-sm text-ink-faint">
            No upcoming tests scheduled.{" "}
            <Link
              href="/tests/upcoming/new"
              className="text-accent hover:underline"
            >
              Schedule one →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((u) => {
              const days = Math.max(
                0,
                Math.ceil(
                  (u.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                )
              );
              const typeLabel =
                TEST_TYPES.find((t) => t.value === u.type)?.label ?? u.type;
              return (
                <div key={u.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-base font-semibold">{u.name}</div>
                        <span className="chip text-[10px]">{typeLabel}</span>
                      </div>
                      <div className="text-xs text-ink-faint mt-1 flex items-center gap-2 flex-wrap">
                        <span>{fmtDate(u.date, true)}</span>
                        {u.maxMarks != null && (
                          <span>· {u.maxMarks} marks</span>
                        )}
                        {u.durationMinutes != null && (
                          <span>· {u.durationMinutes} min</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`chip ${
                          days <= 2
                            ? "text-bad border-bad/40 bg-bad/10"
                            : days <= 7
                            ? "text-warn border-warn/40 bg-warn/10"
                            : ""
                        }`}
                      >
                        {days === 0 ? "Today" : `in ${days}d`}
                      </span>
                      <Link
                        href={`/tests/new?upcoming=${u.id}`}
                        className="btn-ghost text-xs"
                      >
                        Log scores
                      </Link>
                      <DeleteUpcomingTestButton id={u.id} />
                    </div>
                  </div>

                  {u.subjects.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {u.subjects.map((us) => (
                        <div
                          key={us.id}
                          className="bg-bg-soft border border-border-soft rounded-lg p-3"
                        >
                          <SubjectPill
                            name={us.subject.name}
                            color={us.subject.color}
                          />
                          <div className="text-xs text-ink-dim mt-2">
                            {us.chapters || "Full syllabus"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {u.preparation && (
                    <div className="mt-3 text-sm text-ink-dim border-t border-border-soft pt-3">
                      <span className="text-ink-faint text-xs uppercase tracking-wide mr-2">
                        Prep plan
                      </span>
                      {u.preparation}
                    </div>
                  )}
                  {u.notes && (
                    <div className="mt-3 text-sm text-ink-dim border-t border-border-soft pt-3">
                      {u.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Past */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-dim">
            Past tests
          </h2>
        </div>
        {tests.length === 0 ? (
          <EmptyState
            title="No tests logged yet"
            description="Log school exams and coaching tests with subject-wise breakdown to track strengths and weaknesses over time."
            action={
              <Link href="/tests/new" className="btn-primary">
                <Plus className="w-4 h-4" /> Log first test
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {tests.map((t) => {
              const overall = pct(t.totalMarks, t.totalMax);
              const typeLabel =
                TEST_TYPES.find((x) => x.value === t.type)?.label ?? t.type;
              return (
                <div key={t.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-base font-semibold">{t.name}</div>
                        <span className="chip text-[10px]">{typeLabel}</span>
                      </div>
                      <div className="text-xs text-ink-faint mt-1">
                        {fmtDate(t.date, true)} · {t.totalMarks}/{t.totalMax} (
                        {overall}%)
                        {t.rank ? ` · Rank ${t.rank}` : ""}
                        {t.percentile != null
                          ? ` · ${t.percentile}%ile`
                          : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`text-2xl font-semibold tracking-tight ${
                          overall >= 80
                            ? "text-good"
                            : overall >= 60
                            ? "text-warn"
                            : "text-bad"
                        }`}
                      >
                        {overall}%
                      </div>
                      {overall >= 80 && (
                        <Trophy className="w-5 h-5 text-good" />
                      )}
                      <DeleteTestButton id={t.id} />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {t.scores.map((s) => {
                      const p = pct(s.marks, s.maxMarks);
                      return (
                        <div
                          key={s.id}
                          className="bg-bg-soft border border-border-soft rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between">
                            <SubjectPill
                              name={s.subject.short}
                              color={s.subject.color}
                            />
                            <span className="text-sm font-semibold">
                              {s.marks}/{s.maxMarks}
                            </span>
                          </div>
                          <div className="mt-2 w-full h-1.5 rounded-full bg-bg overflow-hidden">
                            <div
                              className="h-full"
                              style={{
                                width: `${p}%`,
                                background: s.subject.color,
                              }}
                            />
                          </div>
                          <div className="mt-2 text-xs text-ink-faint flex items-center justify-between">
                            <span>{p}%</span>
                            <span>
                              ✓{s.correct} ✗{s.wrong} ◯{s.unattempted}
                            </span>
                          </div>
                          {s.weakTopics && (
                            <div className="text-xs text-bad mt-1.5">
                              Weak: {s.weakTopics}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {t.notes && (
                    <div className="mt-3 text-sm text-ink-dim border-t border-border-soft pt-3">
                      {t.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
