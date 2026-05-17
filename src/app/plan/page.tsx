import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { can, currentRole } from "@/lib/session";
import {
  addDays,
  fmtDate,
  parseLocalDate,
  toDateInputValue,
  weekStart,
} from "@/lib/utils";
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

  const [subjects, existing, recent] = await Promise.all([
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
  ]);

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

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="text-sm text-ink-dim">
            Plan the week. Compare to actual on the dashboard.
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
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
        subjects={subjects.map((s) => ({
          id: s.id,
          name: s.name,
          short: s.short,
          color: s.color,
        }))}
        weekStartValue={toDateInputValue(monday)}
        weekLabel={`Week of ${fmtDate(monday)} – ${fmtDate(sunday, true)}`}
        existing={existingForForm}
      />

      <div className="card p-5">
        <div className="text-base font-semibold mb-3">Recent plans</div>
        {recent.length === 0 ? (
          <div className="text-sm text-ink-faint">No plans yet.</div>
        ) : (
          <div className="space-y-1">
            {recent.map((p) => {
              const total =
                p.totalHoursGoal ??
                p.subjects.reduce((s, x) => s + x.hoursGoal, 0);
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
