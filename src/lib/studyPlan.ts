import { startOfDay } from "@/lib/utils";

export type PlanSubjectRow = { subjectId: string; hoursGoal: number };

export type StudyPlanLike = {
  totalHoursGoal: number | null;
  subjects: PlanSubjectRow[];
};

/** Total weekly hour target — explicit total wins, else sum of per-subject goals. */
export function planTotalHours(plan: StudyPlanLike): number {
  if (plan.totalHoursGoal != null && plan.totalHoursGoal > 0) {
    return plan.totalHoursGoal;
  }
  return plan.subjects.reduce((s, x) => s + x.hoursGoal, 0);
}

/** Calendar days elapsed in the Mon–Sun week (1–7), local midnight. */
export function weekElapsedDays(
  weekMonday: Date,
  today: Date = startOfDay(new Date()),
): number {
  const mon = startOfDay(weekMonday);
  const t = startOfDay(today);
  const diff = Math.floor((t.getTime() - mon.getTime()) / 86400000);
  return Math.min(7, Math.max(1, diff + 1));
}

/** Pro-rated hours he should have logged by `today` to stay on pace for the full week. */
export function planExpectedHoursByElapsed(
  plan: StudyPlanLike,
  weekMonday: Date,
  today: Date = startOfDay(new Date()),
): number {
  const goal = planTotalHours(plan);
  if (goal <= 0) return 0;
  return (goal * weekElapsedDays(weekMonday, today)) / 7;
}

export function planProgressPct(
  actualTotalHours: number,
  plan: StudyPlanLike,
): number | null {
  const goal = planTotalHours(plan);
  if (!goal) return null;
  return Math.round((actualTotalHours / goal) * 100);
}

/** Pace %: actual vs pro-rated expectation (100% = on track for the week so far). */
export function planPacePct(
  actualTotalHours: number,
  plan: StudyPlanLike,
  weekMonday: Date,
  today: Date = startOfDay(new Date()),
): number | null {
  const expected = planExpectedHoursByElapsed(plan, weekMonday, today);
  if (expected <= 0) return null;
  return Math.round((actualTotalHours / expected) * 100);
}

export function isPlanBehind(
  plan: StudyPlanLike,
  actualTotalHours: number,
  weekMonday: Date,
  today: Date = startOfDay(new Date()),
  /** Fraction of pro-rated goal that still counts as on pace (matches rules engine). */
  paceThreshold = 0.7,
): boolean {
  const expected = planExpectedHoursByElapsed(plan, weekMonday, today);
  if (expected <= 0) return false;
  return actualTotalHours < expected * paceThreshold;
}

export function planBehindSeverity(
  actualTotalHours: number,
  expectedSoFar: number,
): "red" | "warn" {
  if (expectedSoFar <= 0) return "warn";
  return actualTotalHours < expectedSoFar * 0.4 ? "red" : "warn";
}
