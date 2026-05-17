import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { can, currentRole } from "@/lib/session";
import {
  addDays,
  fmtDate,
  parseLocalDate,
  startOfDay,
  toDateInputValue,
  weekStart,
} from "@/lib/utils";
import { sumLoggedHours } from "@/lib/dailyHours";
import {
  planExpectedHoursByElapsed,
  planPacePct,
  planTotalHours,
  weekElapsedDays,
} from "@/lib/studyPlan";
import { PlanForm } from "./PlanForm";

export const dynamic = "force-dynamic";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const role = await currentRole();
  if (!can(role, "plan:edit")) {
    redirect("/");
  }

  const monday = searchParams.week
    ? weekStart(parseLocalDate(searchParams.week))
    : weekStart(new Date());
  const sunday = addDays(monday, 6);

  const today = startOfDay(new Date());
  const [subjects, existing, recent, weekLogs, prevPlan] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.studyPlan.findUnique({
      where: { weekStart: monday },
      include: { subjects: true },
    }),
    prisma.studyPlan.findMany({
      orderBy: { weekStart: "desc" },
      take: 6,
      include: { subjects: { include: { subject: true } } },
    }),
    prisma.dailyLog.findMany({
      where: { date: { gte: monday, lte: sunday } },
    }),
    prisma.studyPlan.findUnique({
      where: { weekStart: addDays(monday, -7) },
      include: { subjects: true },
    }),
  ]);

  const weekActualHours = sumLoggedHours(weekLogs);
  const weekLabel = `${fmtDate(monday)} – ${fmtDate(sunday, true)}`;
  const elapsed = weekElapsedDays(monday, today);

  const existingForForm = existing
    ? {
        totalHoursGoal: existing.totalHoursGoal,
        testsGoal: existing.testsGoal,
        revisionSessionsGoal: existing.revisionSessionsGoal,
        notes: existing.notes,
        byId: Object.fromEntries(
          existing.subjects.map((s) => [s.subjectId, s.hoursGoal])
        ),
      }
    : null;

  const prevMonday = addDays(monday, -7);
  const nextMonday = addDays(monday, 7);
  const goalHours = existing ? planTotalHours(existing) : null;
  const expectedHours =
    existing && goalHours
      ? planExpectedHoursByElapsed(existing, monday, today)
      : null;
  const pacePct =
    existing && goalHours
      ? planPacePct(weekActualHours, existing, monday, today)
      : null;

  const copyFromPrev = prevPlan
    ? {
        totalHoursGoal: prevPlan.totalHoursGoal,
        testsGoal: prevPlan.testsGoal,
        revisionSessionsGoal: prevPlan.revisionSessionsGoal,
        notes: prevPlan.notes,
        byId: Object.fromEntries(
          prevPlan.subjects.map((s) => [s.subjectId, s.hoursGoal]),
        ),
      }
    : null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="card p-4 sm:p-5 border-accent/20 bg-accent/5">
        <div className="text-base font-semibold">Weekly study plan</div>
        <p className="text-sm text-ink-dim mt-1">
          Targets for {weekLabel}. Pace matches the dashboard and alerts (day{" "}
          {elapsed}/7 →{" "}
          {expectedHours != null
            ? `${expectedHours.toFixed(1)}h expected so far`
            : "set targets below"}
          ).
        </p>
        {existing && goalHours != null && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span>
              Logged: <strong>{weekActualHours.toFixed(1)}h</strong>
            </span>
            <span>
              Week goal: <strong>{goalHours}h</strong>
            </span>
            {pacePct != null && (
              <span
                className={
                  pacePct >= 90
                    ? "text-good"
                    : pacePct >= 70
                      ? "text-warn"
                      : "text-bad"
                }
              >
                On pace: <strong>{pacePct}%</strong>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs text-ink-faint">Jump between weeks</div>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <a
            href={`/plan?week=${toDateInputValue(prevMonday)}`}
            className="btn-ghost"
          >
            ← Previous
          </a>
          <a
            href={`/plan?week=${toDateInputValue(weekStart(new Date()))}`}
            className="btn-ghost"
          >
            This week
          </a>
          <a
            href={`/plan?week=${toDateInputValue(nextMonday)}`}
            className="btn-ghost"
          >
            Next →
          </a>
        </div>
      </div>

      <PlanForm
        key={toDateInputValue(monday)}
        subjects={subjects.map((s) => ({
          id: s.id,
          name: s.name,
          short: s.short,
          color: s.color,
        }))}
        weekStartValue={toDateInputValue(monday)}
        weekLabel={`Week of ${weekLabel}`}
        existing={existingForForm}
        copyFromPrev={!existing ? copyFromPrev : null}
      />

      <div className="card p-5">
        <div className="text-base font-semibold mb-3">Recent plans</div>
        {recent.length === 0 ? (
          <div className="text-sm text-ink-faint">No plans yet.</div>
        ) : (
          <div className="space-y-1">
            {recent.map((p) => {
              const total = planTotalHours(p);
              return (
                <a
                  key={p.id}
                  href={`/plan?week=${toDateInputValue(p.weekStart)}`}
                  className="flex items-center justify-between border-t border-border-soft py-2 text-sm hover:bg-bg-hover px-2 rounded"
                >
                  <span>
                    {fmtDate(p.weekStart)} – {fmtDate(addDays(p.weekStart, 6))}
                  </span>
                  <span className="text-ink-faint text-xs">
                    {total}h ·{" "}
                    {p.subjects
                      .map((s) => `${s.subject.short} ${s.hoursGoal}h`)
                      .join(" · ")}
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
