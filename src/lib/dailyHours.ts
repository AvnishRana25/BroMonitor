// Helpers for aggregating daily-log hours (replaces focus-timer totals).

type LogHours = {
  schoolHours: number;
  coachingHours: number;
  selfStudyHours: number;
};

type LogWithEntries = LogHours & {
  entries: { subjectId: string }[];
};

export function totalLoggedHours(log: LogHours): number {
  return log.schoolHours + log.coachingHours + log.selfStudyHours;
}

/** Per-subject self-study hours: split each day's selfStudyHours across entries. */
export function subjectHoursFromLogs(
  logs: LogWithEntries[],
  subjectId: string
): number {
  let total = 0;
  for (const log of logs) {
    const subEntries = log.entries.filter((e) => e.subjectId === subjectId);
    if (subEntries.length === 0) continue;
    const allCount = log.entries.length || 1;
    total += (log.selfStudyHours * subEntries.length) / allCount;
  }
  return total;
}

export function sumLoggedHours(logs: LogHours[]): number {
  return logs.reduce((s, l) => s + totalLoggedHours(l), 0);
}
