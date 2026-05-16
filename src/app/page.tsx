import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/StatCard";
import { SubjectPill } from "@/components/SubjectPill";
import {
  Clock,
  Flame,
  ClipboardList,
  HelpCircle,
  TrendingUp,
  Target,
  BookOpen,
  CalendarClock,
} from "lucide-react";
import {
  avgProgressPct,
  daysAgo,
  fmtDate,
  pct,
  startOfDay,
  toDateInputValue,
} from "@/lib/utils";
import { WeeklyHoursChart } from "@/components/charts/WeeklyHoursChart";
import { TestTrendChart } from "@/components/charts/TestTrendChart";
import { SubjectMasteryChart } from "@/components/charts/SubjectMasteryChart";

export default async function DashboardPage() {
  const today = startOfDay(new Date());
  const weekAgo = daysAgo(6);
  const monthAgo = daysAgo(29);

  const [
    todaysLog,
    weekLogs,
    openDoubts,
    recentTests,
    subjects,
    topicCounts,
    pendingHomework,
    upcomingTests,
  ] = await Promise.all([
    prisma.dailyLog.findUnique({
      where: { date: today },
      include: {
        entries: { include: { subject: true, chapter: true } },
      },
    }),
    prisma.dailyLog.findMany({
      where: { date: { gte: weekAgo } },
      orderBy: { date: "asc" },
    }),
    prisma.doubt.findMany({
      where: { status: "open" },
      include: { subject: true },
      orderBy: { raisedAt: "asc" },
      take: 5,
    }),
    prisma.test.findMany({
      where: { date: { gte: monthAgo } },
      include: { scores: { include: { subject: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.subject.findMany({
      include: {
        chapters: {
          include: { topics: true },
        },
      },
    }),
    prisma.topic.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.homework.count({
      where: { status: { in: ["pending", "in_progress"] } },
    }),
    prisma.upcomingTest.findMany({
      where: { date: { gte: today } },
      orderBy: { date: "asc" },
      include: { subjects: { include: { subject: true } } },
      take: 3,
    }),
  ]);

  const todayHours =
    (todaysLog?.schoolHours ?? 0) +
    (todaysLog?.coachingHours ?? 0) +
    (todaysLog?.selfStudyHours ?? 0);

  const weekHours = weekLogs.reduce(
    (s, l) => s + l.schoolHours + l.coachingHours + l.selfStudyHours,
    0
  );
  const avgDay = weekLogs.length ? weekHours / weekLogs.length : 0;

  const weekChartData: Array<{
    date: string;
    school: number;
    coaching: number;
    self: number;
  }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = daysAgo(i);
    const log = weekLogs.find(
      (l) => startOfDay(l.date).getTime() === d.getTime()
    );
    weekChartData.push({
      date: fmtDate(d),
      school: log?.schoolHours ?? 0,
      coaching: log?.coachingHours ?? 0,
      self: log?.selfStudyHours ?? 0,
    });
  }

  const totalTopics = subjects.reduce(
    (s, sub) => s + sub.chapters.reduce((a, c) => a + c.topics.length, 0),
    0
  );
  const masteredTopics =
    topicCounts.find((t) => t.status === "mastered")?._count._all ?? 0;
  const startedTopics = topicCounts
    .filter((t) => t.status !== "not_started")
    .reduce((s, t) => s + t._count._all, 0);

  // Subject-wise mastery uses the same weighted average as the Subjects page.
  const subjectMastery = subjects.map((sub) => {
    const allTopics = sub.chapters.flatMap((c) => c.topics);
    return {
      name: sub.name,
      color: sub.color,
      pct: avgProgressPct(allTopics),
    };
  });

  // Test trend
  const testTrend = recentTests.map((t) => ({
    date: fmtDate(t.date),
    name: t.name,
    pct: pct(t.totalMarks, t.totalMax),
  }));

  const lastTest = recentTests[recentTests.length - 1];

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today studied"
          value={`${todayHours.toFixed(1)}h`}
          hint={
            todaysLog
              ? `School ${todaysLog.schoolHours}h · Coach ${todaysLog.coachingHours}h · Self ${todaysLog.selfStudyHours}h`
              : "No log yet today"
          }
          icon={<Clock className="w-4 h-4" />}
          tone={todayHours >= 8 ? "good" : todayHours >= 5 ? "default" : "warn"}
        />
        <StatCard
          label="7-day avg"
          value={`${avgDay.toFixed(1)}h/d`}
          hint={`${weekHours.toFixed(1)}h total this week`}
          icon={<Flame className="w-4 h-4" />}
        />
        <StatCard
          label="Open doubts"
          value={openDoubts.length}
          hint={
            openDoubts.length
              ? `Oldest: ${fmtDate(openDoubts[0].raisedAt)}`
              : "All caught up"
          }
          icon={<HelpCircle className="w-4 h-4" />}
          tone={openDoubts.length > 5 ? "bad" : openDoubts.length > 0 ? "warn" : "good"}
        />
        <StatCard
          label="Pending homework"
          value={pendingHomework}
          hint="School + coaching"
          icon={<ClipboardList className="w-4 h-4" />}
          tone={pendingHomework > 5 ? "bad" : pendingHomework > 0 ? "warn" : "good"}
        />
      </div>

      {/* Mastery + last test */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold">Hours this week</div>
              <div className="text-xs text-ink-faint">
                School vs coaching vs self-study
              </div>
            </div>
            <Link
              href="/daily"
              className="text-xs text-accent hover:underline"
            >
              View all →
            </Link>
          </div>
          <WeeklyHoursChart data={weekChartData} />
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold">Syllabus mastery</div>
              <div className="text-xs text-ink-faint">
                {startedTopics} / {totalTopics} topics started · {masteredTopics} mastered
              </div>
            </div>
            <Target className="w-4 h-4 text-ink-faint" />
          </div>
          <SubjectMasteryChart data={subjectMastery} />
          <div className="mt-4 space-y-2">
            {subjectMastery.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <SubjectPill name={s.name} color={s.color} />
                <span className="font-medium">{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Test trend + today entries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold">Test performance (30d)</div>
              <div className="text-xs text-ink-faint">
                {recentTests.length} test{recentTests.length === 1 ? "" : "s"} ·{" "}
                {lastTest
                  ? `Last: ${lastTest.name} (${pct(lastTest.totalMarks, lastTest.totalMax)}%)`
                  : "No tests yet"}
              </div>
            </div>
            <Link href="/tests" className="text-xs text-accent hover:underline">
              View all →
            </Link>
          </div>
          {testTrend.length > 0 ? (
            <TestTrendChart data={testTrend} />
          ) : (
            <div className="text-sm text-ink-faint py-10 text-center">
              Log a test to see the trend.
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold">Today</div>
              <div className="text-xs text-ink-faint">{fmtDate(today, true)}</div>
            </div>
            <Link
              href={
                todaysLog
                  ? `/daily/new?date=${toDateInputValue(today)}`
                  : "/daily/new"
              }
              className="text-xs text-accent hover:underline"
            >
              {todaysLog ? "Edit →" : "Add log →"}
            </Link>
          </div>
          {todaysLog ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-center">
                <MiniStat
                  label="Hours"
                  value={`${(
                    todaysLog.schoolHours +
                    todaysLog.coachingHours +
                    todaysLog.selfStudyHours
                  ).toFixed(1)}h`}
                  icon={<Clock className="w-3 h-3" />}
                />
                <MiniStat
                  label="Entries"
                  value={todaysLog.entries.length}
                  icon={<BookOpen className="w-3 h-3" />}
                />
              </div>
              <div className="space-y-1.5">
                {todaysLog.entries.slice(0, 5).map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between text-sm border-t border-border-soft pt-1.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <SubjectPill
                        name={e.subject.short}
                        color={e.subject.color}
                      />
                      <span className="truncate">
                        {e.chapter?.name ?? e.subTopic ?? "—"}
                      </span>
                    </div>
                    <span className="text-xs text-ink-faint whitespace-nowrap">
                      {e.source}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-ink-faint">
              No log today yet.{" "}
              <Link href="/daily/new" className="text-accent hover:underline">
                Add now
              </Link>
              .
            </div>
          )}
        </div>
      </div>

      {/* Upcoming tests */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <CalendarClock className="w-4 h-4" />
              Upcoming tests
            </div>
            <div className="text-xs text-ink-faint">
              Plan revision around these.
            </div>
          </div>
          <Link
            href="/tests/upcoming/new"
            className="text-xs text-accent hover:underline"
          >
            Schedule new →
          </Link>
        </div>
        {upcomingTests.length === 0 ? (
          <div className="text-sm text-ink-faint py-2">
            No tests scheduled.
          </div>
        ) : (
          <div className="divide-y divide-border-soft">
            {upcomingTests.map((u) => {
              const days = Math.max(
                0,
                Math.ceil(
                  (u.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                )
              );
              return (
                <div
                  key={u.id}
                  className="py-3 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{u.name}</div>
                    <div className="text-xs text-ink-faint mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{fmtDate(u.date, true)}</span>
                      {u.subjects.map((us) => (
                        <SubjectPill
                          key={us.id}
                          name={us.subject.short}
                          color={us.subject.color}
                        />
                      ))}
                    </div>
                  </div>
                  <span
                    className={`chip whitespace-nowrap ${
                      days <= 2
                        ? "text-bad border-bad/40 bg-bad/10"
                        : days <= 7
                        ? "text-warn border-warn/40 bg-warn/10"
                        : ""
                    }`}
                  >
                    {days === 0 ? "Today" : `in ${days}d`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Doubts row */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Open doubts to resolve
            </div>
            <div className="text-xs text-ink-faint">
              The longer these stay open, the more they hurt.
            </div>
          </div>
          <Link href="/doubts" className="text-xs text-accent hover:underline">
            View all →
          </Link>
        </div>
        {openDoubts.length === 0 ? (
          <div className="text-sm text-ink-faint py-4">No open doubts. Nice.</div>
        ) : (
          <div className="divide-y divide-border-soft">
            {openDoubts.map((d) => (
              <div
                key={d.id}
                className="py-3 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <SubjectPill name={d.subject.short} color={d.subject.color} />
                  <div className="min-w-0">
                    <div className="text-sm truncate">{d.question}</div>
                    <div className="text-xs text-ink-faint mt-0.5">
                      {d.chapter ?? "—"}
                      {d.topic ? ` · ${d.topic}` : ""}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-ink-faint whitespace-nowrap">
                  Open since {fmtDate(d.raisedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-bg-soft border border-border rounded-lg py-2">
      <div className="text-[10px] text-ink-faint uppercase tracking-wide flex items-center gap-1 justify-center">
        {icon}
        {label}
      </div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}
