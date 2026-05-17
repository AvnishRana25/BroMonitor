// Human labels + deep links for the rules engine. Keeps AlertCard and the
// alerts page dumb — all "what does this mean / where do I go?" lives here.

export type AlertKind =
  | "no_recent_study"
  | "test_declining"
  | "stale_doubts"
  | "low_sleep_streak"
  | "burnout_precursor"
  | "low_daily_evidence"
  | "homework_backlog"
  | "log_gap"
  | "plan_behind"
  | "log_without_evidence"
  | "weak_reflection"
  | "ritual_incomplete"
  | "low_energy_streak"
  | "weekend_log_slip";

export type AlertAction = {
  label: string;
  href: string;
};

export const ALERT_KIND_META: Record<
  string,
  { label: string; category: string; action?: (payload: Record<string, unknown>) => AlertAction | null }
> = {
  no_recent_study: {
    label: "Subject neglect",
    category: "Study balance",
    action: (p) =>
      p.subjectId
        ? { label: "Open syllabus", href: `/subjects?s=${p.subjectId}` }
        : { label: "Open syllabus", href: "/subjects" },
  },
  test_declining: {
    label: "Test trend",
    category: "Outcomes",
    action: () => ({ label: "View tests", href: "/tests" }),
  },
  stale_doubts: {
    label: "Stale doubts",
    category: "Doubts",
    action: () => ({ label: "Open doubts", href: "/doubts" }),
  },
  low_sleep_streak: {
    label: "Sleep deficit",
    category: "Wellbeing",
    action: () => ({ label: "Daily logs", href: "/daily" }),
  },
  burnout_precursor: {
    label: "Burnout risk",
    category: "Wellbeing",
    action: () => ({ label: "Today's log", href: "/daily/new" }),
  },
  low_daily_evidence: {
    label: "Missing evidence",
    category: "Trust",
    action: () => ({ label: "Add evidence", href: "/daily/new" }),
  },
  homework_backlog: {
    label: "Homework pile-up",
    category: "Homework",
    action: () => ({ label: "Daily logs", href: "/daily" }),
  },
  ritual_incomplete: {
    label: "Ritual incomplete",
    category: "Consistency",
    action: () => ({ label: "Finish today's log", href: "/daily/new" }),
  },
  low_energy_streak: {
    label: "Low energy",
    category: "Wellbeing",
    action: () => ({ label: "Today's log", href: "/daily/new" }),
  },
  weekend_log_slip: {
    label: "Weekend logging",
    category: "Consistency",
    action: () => ({ label: "Log now", href: "/daily/new" }),
  },
  log_gap: {
    label: "Logging gap",
    category: "Consistency",
    action: () => ({ label: "Log today", href: "/daily/new" }),
  },
  plan_behind: {
    label: "Behind weekly plan",
    category: "Planning",
    action: () => ({ label: "Weekly plan", href: "/plan" }),
  },
  log_without_evidence: {
    label: "No photos today",
    category: "Trust",
    action: () => ({ label: "Add photos", href: "/daily/new" }),
  },
  weak_reflection: {
    label: "Empty reflection",
    category: "Reflection",
    action: () => ({ label: "Write reflection", href: "/daily/new" }),
  },
};

export const SEVERITY_ORDER: Record<string, number> = {
  red: 0,
  warn: 1,
  info: 2,
};

export function sortAlertsBySeverity<
  T extends { severity: string; createdAt: Date | string }
>(alerts: T[]): T[] {
  return [...alerts].sort((a, b) => {
    const sa = SEVERITY_ORDER[a.severity] ?? 9;
    const sb = SEVERITY_ORDER[b.severity] ?? 9;
    if (sa !== sb) return sa - sb;
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });
}

export function alertMeta(kind: string) {
  return (
    ALERT_KIND_META[kind] ?? {
      label: kind.replace(/_/g, " "),
      category: "Other",
    }
  );
}

export function parseAlertPayload(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function alertAction(
  kind: string,
  payload: Record<string, unknown>
): AlertAction | null {
  const meta = ALERT_KIND_META[kind];
  return meta?.action?.(payload) ?? null;
}
