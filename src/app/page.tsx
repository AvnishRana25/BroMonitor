import Link from "next/link";
import { prisma } from "@/lib/db";
import { SubjectPill } from "@/components/SubjectPill";
import {
  BookOpen,
  CalendarClock,
  Camera,
  Clock,
  MessageSquare,
  Siren,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { currentRole, can } from "@/lib/session";
import {
  avgProgressPct,
  daysAgo,
  fmtDate,
  pct,
  startOfDay,
  toDateInputValue,
  weekStart,
  addDays,
} from "@/lib/utils";
import { WeeklyHoursChart } from "@/components/charts/WeeklyHoursChart";
import { TestTrendChart } from "@/components/charts/TestTrendChart";
import { ExecutiveSummary } from "@/components/ExecutiveSummary";
import { PlanVsActual } from "@/components/PlanVsActual";
import { AlertCard } from "@/components/AlertCard";
import {
  CommentItem,
  GuardianCommentBox,
} from "@/components/GuardianCommentBox";
import { evaluateAlerts } from "@/lib/rules";
import { subjectHoursFromLogs, sumLoggedHours } from "@/lib/dailyHours";
import { SyllabusMasteryPanel, type SubjectMasteryData } from "@/components/SyllabusMasteryPanel";
import { FatherTodayBrief } from "@/components/FatherTodayBrief";
import { StudentTodayBrief } from "@/components/StudentTodayBrief";
import { alertAction, parseAlertPayload } from "@/lib/alertMeta";
import { entryHasStudyContent } from "@/lib/dailyRitual";

export default async function DashboardPage() {
  const today = startOfDay(new Date());
  const weekAgo = daysAgo(6);
  const monthAgo = daysAgo(29);
  const monday = weekStart(today);
  const sunday = addDays(monday, 6);
  const role = await currentRole();
  const canSeeAlerts = can(role, "alert:view");
  const canAckAlerts = can(role, "alert:ack");
  const canDeleteAlerts = can(role, "alert:delete");
  const canEditPlan = can(role, "plan:edit");
  const canCreateComment = can(role, "comment:create");
  const canDeleteComment = can(role, "comment:delete");

  // Evaluate the rules engine first — its outputs feed the summary card. Cheap
  // local SQLite work, fine to run inline on every dashboard render.
  await evaluateAlerts();

  const [
    todaysLog,
    weekLogs,
    openDoubts,
    recentTests,
    subjects,
    topicCounts,
    pendingHomework,
    upcomingTests,
    weekLogsMonStart,
    plan,
    activeAlerts,
    generalComments,
  ] = await Promise.all([
    prisma.dailyLog.findUnique({
      where: { date: today },
      include: {
        entries: { include: { subject: true, chapter: true } },
        reflection: true,
        photos: true,
      },
    }),
    prisma.dailyLog.findMany({
      where: { date: { gte: weekAgo } },
      include: { photos: true },
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
        chapters: { include: { topics: true } },
      },
      orderBy: { name: "asc" },
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
    prisma.dailyLog.findMany({
      where: { date: { gte: monday } },
      include: { entries: true, photos: true },
    }),
    prisma.studyPlan.findUnique({
      where: { weekStart: monday },
      include: { subjects: { include: { subject: true } } },
    }),
    // For dashboard: top 3 unacknowledged active alerts (severity-ordered).
    // Severity strings are coincidentally alphabetised the right way:
    // 'info' < 'red' < 'warn'. That's wrong; sort manually.
    prisma.alert.findMany({
      where: { resolvedAt: null, acknowledgedAt: null },
    }),
    // General-scope father notes (the "Father's notes" feed).
    prisma.guardianComment.findMany({
      where: { scope: "general" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // --- Today + this week hour breakdowns ---
  const todaySchoolHours = todaysLog?.schoolHours ?? 0;
  const todayCoachingHours = todaysLog?.coachingHours ?? 0;
  const todaySelfHours = todaysLog?.selfStudyHours ?? 0;
  const todayHours = todaySchoolHours + todayCoachingHours + todaySelfHours;
  const todayEvidenceCount = todaysLog?.photos.length ?? 0;

  const weekHoursRolling = sumLoggedHours(weekLogs);
  const avgDay = weekHoursRolling / 7;
  const weekLoggedHoursMonStart = sumLoggedHours(weekLogsMonStart);

  const weekChartData: Array<{
    date: string;
    school: number;
    coaching: number;
    self: number;
    evidence: number;
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
      evidence: log?.photos?.length ?? 0,
    });
  }

  // --- Mastery ---
  const totalTopics = subjects.reduce(
    (s, sub) => s + sub.chapters.reduce((a, c) => a + c.topics.length, 0),
    0
  );
  const masteredTopics =
    topicCounts.find((t) => t.status === "mastered")?._count._all ?? 0;
  const startedTopics = topicCounts
    .filter((t) => t.status !== "not_started")
    .reduce((s, t) => s + t._count._all, 0);

  const subjectMastery: SubjectMasteryData[] = subjects.map((sub) => {
    const allTopics = sub.chapters.flatMap((c) => c.topics);
    const statusCounts: Record<string, number> = {};
    for (const t of allTopics) {
      statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1;
    }
    const started = allTopics.filter((t) => t.status !== "not_started").length;
    const mastered = allTopics.filter((t) => t.status === "mastered").length;
    return {
      id: sub.id,
      short: sub.short,
      name: sub.name,
      color: sub.color,
      pct: avgProgressPct(allTopics),
      totalTopics: allTopics.length,
      startedTopics: started,
      masteredTopics: mastered,
      statusCounts,
    };
  });

  const testTrend = recentTests.map((t) => ({
    date: fmtDate(t.date),
    name: t.name,
    pct: pct(t.totalMarks, t.totalMax),
  }));
  const lastTest = recentTests[recentTests.length - 1];

  // --- Executive summary numbers ---
  const daysLogged7 = weekLogs.length;
  const nextTest = upcomingTests[0]
    ? {
        name: upcomingTests[0].name,
        daysAway: Math.max(
          0,
          Math.ceil(
            (upcomingTests[0].date.getTime() - today.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        ),
      }
    : null;

  // Severity ordering for alerts — red > warn > info.
  const sevRank = { red: 0, warn: 1, info: 2 } as const;
  const sortedAlerts = [...activeAlerts].sort((a, b) => {
    const aw = sevRank[(a.severity as keyof typeof sevRank) ?? "info"] ?? 3;
    const bw = sevRank[(b.severity as keyof typeof sevRank) ?? "info"] ?? 3;
    if (aw !== bw) return aw - bw;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  const redAlerts = sortedAlerts.filter((a) => a.severity === "red").length;
  const warnAlerts = sortedAlerts.filter((a) => a.severity === "warn").length;
  const dashboardAlerts = sortedAlerts.slice(0, 3);

  // --- Planned vs Actual rows ---
  const planRows = subjects.map((sub) => {
    const planned = plan?.subjects.find((p) => p.subjectId === sub.id);
    return {
      subjectId: sub.id,
      subject: sub.name,
      short: sub.short,
      color: sub.color,
      plannedHours: planned?.hoursGoal ?? 0,
      actualHours: Number(
        subjectHoursFromLogs(weekLogsMonStart, sub.id).toFixed(2)
      ),
    };
  });
  const weekGoalHours =
    plan?.totalHoursGoal ??
    (plan ? plan.subjects.reduce((s, x) => s + x.hoursGoal, 0) : null);

  const weekLabel = `${fmtDate(monday)} – ${fmtDate(sunday)}`;

  // --- Comment lists ---
  const generalCommentItems: CommentItem[] = generalComments.map((c) => ({
    id: c.id,
    body: c.body,
    authorRole: c.authorRole,
    createdAt: c.createdAt.toISOString(),
  }));

  const topAlertRow =
    sortedAlerts.find((a) => a.severity === "red") ?? sortedAlerts[0];
  const topAlert = topAlertRow
    ? {
        title: topAlertRow.title,
        severity: topAlertRow.severity as "red" | "warn" | "info",
        href:
          alertAction(
            topAlertRow.kind,
            parseAlertPayload(topAlertRow.payload)
          )?.href ?? "/alerts",
      }
    : null;

  const weakestSubject = [...subjectMastery].sort((a, b) => a.pct - b.pct)[0];
  const masteryGap = weakestSubject
    ? {
        subject: weakestSubject.name,
        pct: weakestSubject.pct,
        color: weakestSubject.color,
        href: `/subjects?s=${weakestSubject.id}`,
      }
    : null;

  // Use the shared ritual predicate so the dashboard badge and the server
  // ritual check never disagree on what counts as a real study row.
  const hasStudyRow =
    !!todaysLog && todaysLog.entries.some((e) => entryHasStudyContent(e));

  return (
    <div className="space-y-6">
      {(role === "guardian" || role === "admin") && (
        <FatherTodayBrief
          topAlert={topAlert}
          nextTest={nextTest}
          masteryGap={masteryGap}
          brotherLoggedToday={!!todaysLog}
          hasEvidenceToday={(todaysLog?.photos.length ?? 0) > 0}
        />
      )}
      {role === "student" && (
        <StudentTodayBrief
          loggedToday={!!todaysLog}
          hasEvidence={(todaysLog?.photos.length ?? 0) > 0}
          hasStudyRow={hasStudyRow}
        />
      )}

      <ExecutiveSummary
        weekLabel={weekLabel}
        weekTrackedHours={weekLoggedHoursMonStart}
        weekGoalHours={weekGoalHours}
        daysLogged7={daysLogged7}
        redAlerts={redAlerts}
        warnAlerts={warnAlerts}
        nextTest={nextTest}
        subjectMastery={subjectMastery}
        canSeeAlerts={canSeeAlerts}
      />

      {/* Planned vs Actual + Alerts side-by-side on wide screens. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={canSeeAlerts ? "lg:col-span-1" : "lg:col-span-3"}>
          <PlanVsActual
            weekLabel={weekLabel}
            rows={planRows}
            hasPlan={!!plan}
            canEditPlan={canEditPlan}
          />
        </div>
        {canSeeAlerts && (
          <div className="lg:col-span-2">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <Siren className="w-4 h-4 text-bad" />
                    Alerts
                    {sortedAlerts.length > 0 && (
                      <span className="text-xs text-ink-faint font-normal">
                        ({redAlerts} red, {warnAlerts} warn)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-faint">
                    Deterministic rules. Each one tells you exactly why.
                  </div>
                </div>
                <Link
                  href="/alerts"
                  className="text-xs text-accent hover:underline"
                >
                  All alerts →
                </Link>
              </div>
              {dashboardAlerts.length === 0 ? (
                <div className="text-sm text-ink-faint py-4 text-center">
                  All clear. No active alerts.
                </div>
              ) : (
                <div className="space-y-2">
                  {dashboardAlerts.map((a) => (
                    <AlertCard
                      key={a.id}
                      id={a.id}
                      kind={a.kind}
                      severity={a.severity as "info" | "warn" | "red"}
                      title={a.title}
                      body={a.body}
                      suggestion={a.suggestion}
                      createdAt={a.createdAt.toISOString()}
                      acknowledgedAt={null}
                      acknowledgedBy={null}
                      resolvedAt={null}
                      canAck={canAckAlerts}
                      canDelete={canDeleteAlerts}
                      payloadJson={a.payload}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Father's notes feed — visible to everyone, compose box only for guardian/admin. */}
      {(generalCommentItems.length > 0 || canCreateComment) && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-accent" />
                Father&apos;s notes
              </div>
              <div className="text-xs text-ink-faint">
                Use them. He reads them.
              </div>
            </div>
          </div>
          <GuardianCommentBox
            scope="general"
            comments={generalCommentItems}
            canCreate={canCreateComment}
            canDelete={canDeleteComment}
            placeholder="Leave a note for him — e.g. 'Revise organic chemistry naming tomorrow.'"
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold">Hours, last 7 days</div>
              <div className="text-xs text-ink-faint">
                School · coaching · self-study · evidence photos per day.{" "}
                Avg {avgDay.toFixed(1)}h/day.
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
                {startedTopics} / {totalTopics} topics started · {masteredTopics}{" "}
                mastered
              </div>
            </div>
            <Target className="w-4 h-4 text-ink-faint" />
          </div>
          <SyllabusMasteryPanel
            subjects={subjectMastery}
            totalTopics={totalTopics}
            startedTopics={startedTopics}
            masteredTopics={masteredTopics}
          />
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
              <div className="text-xs text-ink-faint">
                {fmtDate(today, true)}
              </div>
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
              <div className="grid grid-cols-3 gap-2 text-center">
                <MiniStat
                  label="Total"
                  value={`${todayHours.toFixed(1)}h`}
                  icon={<Clock className="w-3 h-3" />}
                />
                <MiniStat
                  label="Evidence"
                  value={todayEvidenceCount}
                  icon={<Camera className="w-3 h-3" />}
                />
                <MiniStat
                  label="Entries"
                  value={todaysLog?.entries.length ?? 0}
                  icon={<BookOpen className="w-3 h-3" />}
                />
              </div>
              <div className="space-y-1.5">
                {todaysLog?.entries.slice(0, 5).map((e) => (
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

      {/* Reflection — today */}
      {todaysLog?.reflection &&
        (todaysLog.reflection.learned ||
          todaysLog.reflection.confused ||
          todaysLog.reflection.hardestSolved) && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  Today&apos;s reflection
                </div>
                <div className="text-xs text-ink-faint">In his own words.</div>
              </div>
              <Link
                href={`/daily/new?date=${toDateInputValue(today)}`}
                className="text-xs text-accent hover:underline"
              >
                Edit →
              </Link>
            </div>
            <div className="space-y-2">
              {todaysLog.reflection.learned && (
                <ReflLine
                  label="Learned"
                  text={todaysLog.reflection.learned}
                />
              )}
              {todaysLog.reflection.confused && (
                <ReflLine
                  label="Confused by"
                  text={todaysLog.reflection.confused}
                  tone="warn"
                />
              )}
              {todaysLog.reflection.hardestSolved && (
                <ReflLine
                  label="Hardest solved"
                  text={todaysLog.reflection.hardestSolved}
                  tone="good"
                />
              )}
            </div>
          </div>
        )}

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
          <div className="text-sm text-ink-faint py-4">
            No open doubts. Nice.
          </div>
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

function ReflLine({
  label,
  text,
  tone = "default",
}: {
  label: string;
  text: string;
  tone?: "default" | "good" | "warn";
}) {
  const toneCls =
    tone === "good"
      ? "text-good"
      : tone === "warn"
      ? "text-warn"
      : "text-ink-dim";
  return (
    <div className="text-sm">
      <span className={`text-[10px] uppercase tracking-wide mr-2 ${toneCls}`}>
        {label}
      </span>
      <span className="text-ink-dim">{text}</span>
    </div>
  );
}
