// Rules-engine for BroMonitor alerts.
//
// Design notes:
// - Every rule is a pure function from a ruleContext → array of RuleOutput.
// - RuleOutput has a stable `dedupeKey` so the same ongoing condition
//   ("no physics for 5 days") doesn't produce a new alert on every render.
// - The evaluator upserts: existing matching dedupeKey is left alone (so
//   father's acknowledgement persists), missing ones are created, and
//   previously-active alerts that no longer trigger are marked resolved.
// - All rules are deterministic SQL/JS — no LLMs, no probabilistic models.
//   If a parent confronts the brother over a flag, you can explain exactly
//   why the flag fired, which is the whole point of not using AI here.

import { prisma } from "@/lib/db";
import {
  startOfDay,
  weekStart,
  addDays,
  daysAgo,
  pct,
  toDateInputValue,
} from "@/lib/utils";

export type RuleOutput = {
  kind: string;
  severity: "info" | "warn" | "red";
  dedupeKey: string;
  title: string;
  body: string;
  suggestion?: string;
  payload?: Record<string, unknown>;
};

type Ctx = Awaited<ReturnType<typeof loadContext>>;

// --- Context loader ------------------------------------------------------
//
// One round-trip for everything the rules need. Keeps the evaluator cheap so
// it can run inline on every dashboard request without caching.
async function loadContext() {
  const today = startOfDay(new Date());
  const weekMon = weekStart(today);
  const since14 = daysAgo(13);
  const since30 = daysAgo(30);
  const since90 = daysAgo(90);

  const [
    subjects,
    daysLogs,
    weekLogs,
    logs30,
    tests90,
    openDoubts,
    pendingHomework,
    plan,
  ] = await Promise.all([
    prisma.subject.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.dailyLog.findMany({
      where: { date: { gte: since14 } },
      include: { entries: true, photos: true, reflection: true },
      orderBy: { date: "asc" },
    }),
    prisma.dailyLog.findMany({
      where: { date: { gte: weekMon } },
      include: { entries: true },
    }),
    prisma.dailyLog.findMany({
      where: { date: { gte: since30 } },
      include: {
        entries: { select: { subjectId: true, chapterId: true, topicId: true, subTopic: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.test.findMany({
      where: { date: { gte: since90 } },
      orderBy: { date: "asc" },
    }),
    prisma.doubt.findMany({
      where: { status: "open" },
      include: { subject: true },
    }),
    prisma.homework.findMany({
      where: { status: { in: ["pending", "in_progress"] } },
      include: { subject: true },
      orderBy: { dueAt: "asc" },
    }),
    prisma.studyPlan.findUnique({
      where: { weekStart: weekMon },
      include: { subjects: { include: { subject: true } } },
    }),
  ]);

  return {
    today,
    weekMon,
    subjects,
    daysLogs,
    weekLogs,
    logs30,
    tests90,
    openDoubts,
    pendingHomework,
    plan,
  };
}

// --- Individual rules ----------------------------------------------------
//
// Each rule returns 0+ RuleOutputs. Keep them small, named, and explainable.

function noRecentSubjectStudy(ctx: Ctx): RuleOutput[] {
  const out: RuleOutput[] = [];
  const NO_STUDY_DAYS = 5;
  for (const sub of ctx.subjects) {
    let lastDate: Date | null = null;
    for (const log of ctx.logs30) {
      if (
        log.entries.some(
          (e) =>
            e.subjectId === sub.id && (e.chapterId || e.topicId || e.subTopic)
        )
      ) {
        lastDate = log.date;
      }
    }
    const daysSince = lastDate
      ? Math.floor(
          (Date.now() - startOfDay(lastDate).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 999;
    if (daysSince >= NO_STUDY_DAYS) {
      out.push({
        kind: "no_recent_study",
        severity: daysSince >= 10 ? "red" : "warn",
        dedupeKey: `no_recent_study:${sub.id}`,
        title: `No ${sub.name.toLowerCase()} in ${
          daysSince >= 30 ? "30+" : daysSince
        } days`,
        body: lastDate
          ? `Last daily log entry for ${sub.name.toLowerCase()} was ${daysSince} days ago.`
          : `No ${sub.name.toLowerCase()} chapters logged in the last 30 days.`,
        suggestion: `Log today's ${sub.name.toLowerCase()} study with a photo on the daily log.`,
        payload: { subjectId: sub.id, subjectName: sub.name, daysSince },
      });
    }
  }
  return out;
}

function testScoreDeclining(ctx: Ctx): RuleOutput[] {
  if (ctx.tests90.length < 3) return [];
  const last3 = ctx.tests90.slice(-3);
  const pcts = last3.map((t) => pct(t.totalMarks, t.totalMax));
  const monotonicallyDown = pcts[0] > pcts[1] && pcts[1] > pcts[2];
  const drop = pcts[0] - pcts[2];
  if (!monotonicallyDown || drop < 8) return [];
  const latestPct = pcts[2];
  if (latestPct >= 75) return []; // still performing fine overall
  return [
    {
      kind: "test_declining",
      severity: drop >= 15 || latestPct < 50 ? "red" : "warn",
      dedupeKey: "test_declining:rolling",
      title: `Test scores declining (-${drop}pp over last 3)`,
      body: `${last3
        .map((t, i) => `${t.name} ${pcts[i]}%`)
        .join(" → ")}. Three tests in a row trending down.`,
      suggestion: "Open the last test, look at the weak topics, plan revision.",
      payload: { testIds: last3.map((t) => t.id), pcts },
    },
  ];
}

function staleDoubts(ctx: Ctx): RuleOutput[] {
  const STALE_DAYS = 7;
  const stale = ctx.openDoubts.filter((d) => {
    const ageDays = Math.floor(
      (Date.now() - d.raisedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    return ageDays >= STALE_DAYS;
  });
  if (stale.length === 0) return [];
  const oldest = stale.reduce((a, b) =>
    a.raisedAt < b.raisedAt ? a : b
  );
  const oldestDays = Math.floor(
    (Date.now() - oldest.raisedAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  return [
    {
      kind: "stale_doubts",
      severity: stale.length >= 5 || oldestDays >= 14 ? "red" : "warn",
      dedupeKey: "stale_doubts",
      title: `${stale.length} doubt${
        stale.length === 1 ? "" : "s"
      } unresolved for 7+ days`,
      body:
        stale
          .slice(0, 3)
          .map((d) => `· ${d.subject.short}: ${d.question.slice(0, 80)}`)
          .join("\n") +
        (stale.length > 3 ? `\n· …and ${stale.length - 3} more` : ""),
      suggestion: "Either resolve them with a teacher or close them out as known.",
      payload: { doubtIds: stale.map((d) => d.id), count: stale.length },
    },
  ];
}

function lowSleepStreak(ctx: Ctx): RuleOutput[] {
  // 3+ consecutive days of sleep < 6h (where logged).
  const ordered = [...ctx.daysLogs].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
  let streak = 0;
  for (const log of ordered) {
    if (log.sleepHours != null && log.sleepHours < 6) {
      streak++;
    } else {
      break;
    }
  }
  if (streak < 3) return [];
  return [
    {
      kind: "low_sleep_streak",
      severity: streak >= 5 ? "red" : "warn",
      dedupeKey: `low_sleep_streak`,
      title: `Sleep below 6h for ${streak} days running`,
      body: `Class 11 + JEE prep with chronic sleep deficit is the textbook burnout setup.`,
      suggestion: "Cap evening self-study at 10:30 PM for a few nights.",
      payload: { streak },
    },
  ];
}

function highHoursLowSleep(ctx: Ctx): RuleOutput[] {
  // Burnout precursor — yesterday >= 8h studied and slept < 6h.
  const ordered = [...ctx.daysLogs].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
  const recent = ordered.slice(0, 3);
  const matches = recent.filter((l) => {
    const hours = l.schoolHours + l.coachingHours + l.selfStudyHours;
    return l.sleepHours != null && l.sleepHours < 6 && hours >= 8;
  });
  if (matches.length === 0) return [];
  return [
    {
      kind: "burnout_precursor",
      severity: matches.length >= 2 ? "red" : "warn",
      dedupeKey: `burnout_precursor`,
      title: `Burnout precursor: long hours, short sleep`,
      body: `${matches.length} day${
        matches.length === 1 ? "" : "s"
      } in the last 3 with 8h+ study and under 6h sleep.`,
      suggestion: "Insist on 7+ hours tonight. One bad week isn't worth the year.",
      payload: { matchCount: matches.length },
    },
  ];
}

function lowDailyEvidence(ctx: Ctx): RuleOutput[] {
  const days: { key: number; photos: number }[] = [];
  for (let i = 0; i < 3; i++) {
    days.push({ key: daysAgo(i).getTime(), photos: 0 });
  }
  for (const log of ctx.daysLogs) {
    const k = startOfDay(log.date).getTime();
    const bucket = days.find((d) => d.key === k);
    if (bucket) bucket.photos += log.photos.length;
  }
  const allMissing = days.every((d) => d.photos === 0);
  if (!allMissing) return [];
  return [
    {
      kind: "low_daily_evidence",
      severity: "warn",
      dedupeKey: "low_daily_evidence",
      title: "No study evidence photos for 3 days in a row",
      body: "The daily log has no notebook photos attached. Evidence photos are how you verify what he actually studied.",
      suggestion: "Ask him to open today's daily log and snap photos of solved problems.",
    },
  ];
}

function homeworkBacklog(ctx: Ctx): RuleOutput[] {
  const now = Date.now();
  const overdue = ctx.pendingHomework.filter(
    (h) => h.dueAt && h.dueAt.getTime() < now
  );
  const count = ctx.pendingHomework.length;
  if (count < 5 && overdue.length < 2) return [];
  return [
    {
      kind: "homework_backlog",
      severity:
        count >= 10 || overdue.length >= 4
          ? "red"
          : overdue.length >= 2
          ? "warn"
          : "warn",
      dedupeKey: "homework_backlog",
      title:
        overdue.length > 0
          ? `${overdue.length} overdue homework · ${count} pending total`
          : `${count} homework items pending`,
      body:
        overdue.length > 0
          ? `Overdue: ${overdue
              .slice(0, 3)
              .map((h) => `${h.subject.short}: ${h.title}`)
              .join("; ")}${overdue.length > 3 ? "…" : ""}`
          : "Pending homework piling up usually means he's behind on a chapter.",
      suggestion: "Review pending items on the daily log and mark done or drop stale ones.",
      payload: { count, overdueCount: overdue.length },
    },
  ];
}

function logGap(ctx: Ctx): RuleOutput[] {
  // No daily log for today AND yesterday.
  const today = ctx.today;
  const yest = addDays(today, -1);
  const hasToday = ctx.daysLogs.some(
    (l) => startOfDay(l.date).getTime() === today.getTime()
  );
  const hasYest = ctx.daysLogs.some(
    (l) => startOfDay(l.date).getTime() === yest.getTime()
  );
  if (hasToday || hasYest) return [];
  // Find the gap length.
  let gap = 1;
  let probe = addDays(today, -gap);
  while (
    !ctx.daysLogs.some(
      (l) => startOfDay(l.date).getTime() === probe.getTime()
    ) &&
    gap < 14
  ) {
    gap++;
    probe = addDays(today, -gap);
  }
  return [
    {
      kind: "log_gap",
      severity: gap >= 4 ? "red" : "warn",
      dedupeKey: "log_gap",
      title: `No daily log for ${gap} days`,
      body: "Without daily logs, mastery and consistency numbers stop being meaningful.",
      suggestion: "Ask him to backfill the last few days. 2 minutes per day.",
      payload: { gap },
    },
  ];
}

function planBehind(ctx: Ctx): RuleOutput[] {
  if (!ctx.plan) return [];
  const elapsedDays = Math.min(
    7,
    Math.max(
      1,
      Math.floor((ctx.today.getTime() - ctx.weekMon.getTime()) / 86400000) + 1
    )
  );
  if (elapsedDays < 3) return []; // too early to call it
  const actualTracked = ctx.weekLogs.reduce(
    (s, l) => s + l.schoolHours + l.coachingHours + l.selfStudyHours,
    0
  );
  const goalTotal =
    ctx.plan.totalHoursGoal ??
    ctx.plan.subjects.reduce((s, x) => s + x.hoursGoal, 0);
  if (!goalTotal || goalTotal <= 0) return [];
  // Pro-rate the goal by elapsed days.
  const expectedSoFar = (goalTotal * elapsedDays) / 7;
  if (actualTracked >= expectedSoFar * 0.7) return [];
  const shortfall = expectedSoFar - actualTracked;
  return [
    {
      kind: "plan_behind",
      severity: actualTracked < expectedSoFar * 0.4 ? "red" : "warn",
      dedupeKey: `plan_behind:${toDateInputValue(ctx.weekMon)}`,
      title: `Behind plan: ${actualTracked.toFixed(
        1
      )}h logged vs ${expectedSoFar.toFixed(1)}h expected by today`,
      body: `Week's goal is ${goalTotal}h. ${shortfall.toFixed(
        1
      )}h short for where he should be ${elapsedDays}/7 days in.`,
      suggestion:
        "Either adjust the plan to reality or block out catch-up sessions before Sunday.",
      payload: {
        actualTracked,
        expectedSoFar,
        goalTotal,
        elapsedDays,
      },
    },
  ];
}

function logWithoutEvidenceToday(ctx: Ctx): RuleOutput[] {
  const todayLog = ctx.daysLogs.find(
    (l) => startOfDay(l.date).getTime() === ctx.today.getTime()
  );
  if (!todayLog) return [];
  if (todayLog.photos.length > 0) return [];
  const hasStudy =
    todayLog.entries.length > 0 ||
    todayLog.selfStudyHours > 0 ||
    todayLog.schoolHours > 0 ||
    todayLog.coachingHours > 0;
  if (!hasStudy) return [];
  return [
    {
      kind: "log_without_evidence",
      severity: "warn",
      dedupeKey: "log_without_evidence:today",
      title: "Today's log has no evidence photos",
      body: "He logged study today but didn't attach notebook photos. You can't verify what was actually done.",
      suggestion: "Ask him to reopen today's log and snap at least one photo before bed.",
    },
  ];
}

function weakReflection(ctx: Ctx): RuleOutput[] {
  const recent = [...ctx.daysLogs]
    .filter((l) => {
      const k = startOfDay(l.date).getTime();
      return k >= daysAgo(4).getTime() && k <= ctx.today.getTime();
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  if (recent.length < 3) return [];
  const empty = recent.filter((l) => {
    const r = l.reflection;
    return !r?.learned?.trim() && !r?.confused?.trim() && !r?.hardestSolved?.trim();
  });
  if (empty.length < 3) return [];
  return [
    {
      kind: "weak_reflection",
      severity: "info",
      dedupeKey: "weak_reflection",
      title: "Reflection blank on recent logs",
      body: `${empty.length} of the last ${recent.length} daily logs have no reflection (learned / confused / hardest). Optional, but useful for honesty checks.`,
      suggestion: "Ask for 2–3 sentences tonight — what clicked, what didn't.",
    },
  ];
}

function ritualIncompleteToday(ctx: Ctx): RuleOutput[] {
  const todayLog = ctx.daysLogs.find(
    (l) => startOfDay(l.date).getTime() === ctx.today.getTime()
  );
  if (!todayLog) return [];
  const hasPhoto = todayLog.photos.length > 0;
  // Aligned with src/lib/dailyRitual.ts → chapter required + topic/subTopic.
  const hasStudyRow = todayLog.entries.some(
    (e) =>
      !!e.chapterId &&
      ((e.topicId && e.topicId !== "__other__") || !!e.subTopic?.trim()),
  );
  if (hasPhoto && hasStudyRow) return [];
  const missing: string[] = [];
  if (!hasPhoto) missing.push("photo evidence");
  if (!hasStudyRow) missing.push("chapter + topic");
  return [
    {
      kind: "ritual_incomplete",
      severity: "warn",
      dedupeKey: "ritual_incomplete:today",
      title: `Today's log missing ${missing.join(" and ")}`,
      body: `The daily ritual requires at least one photo and one syllabus row. Missing: ${missing.join(", ")}.`,
      suggestion: "Open today's log and finish the required fields before bed.",
    },
  ];
}

function lowEnergyStreak(ctx: Ctx): RuleOutput[] {
  const ordered = [...ctx.daysLogs].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
  let streak = 0;
  for (const log of ordered) {
    if (log.energy != null && log.energy <= 2) streak++;
    else if (log.energy != null) break;
  }
  if (streak < 3) return [];
  return [
    {
      kind: "low_energy_streak",
      severity: streak >= 5 ? "red" : "warn",
      dedupeKey: "low_energy_streak",
      title: `Energy rated ≤2 for ${streak} days running`,
      body: "Low energy scores often mean poor sleep, illness, or overload — not laziness.",
      suggestion: "Check sleep hours and cut one non-essential block tomorrow.",
      payload: { streak },
    },
  ];
}

function weekendLogSlip(ctx: Ctx): RuleOutput[] {
  const day = ctx.today.getDay();
  if (day !== 0 && day !== 6) return []; // Sat/Sun only
  const fri = addDays(ctx.today, day === 0 ? -2 : -1);
  const sat = addDays(ctx.today, day === 0 ? -1 : 0);
  const hasFri = ctx.daysLogs.some(
    (l) => startOfDay(l.date).getTime() === fri.getTime()
  );
  const hasSat = ctx.daysLogs.some(
    (l) => startOfDay(l.date).getTime() === sat.getTime()
  );
  const hasToday = ctx.daysLogs.some(
    (l) => startOfDay(l.date).getTime() === ctx.today.getTime()
  );
  if (hasToday || (hasFri && hasSat)) return [];
  return [
    {
      kind: "weekend_log_slip",
      severity: "info",
      dedupeKey: `weekend_log_slip:${toDateInputValue(ctx.today)}`,
      title: "Weekend logging slipped",
      body: "No log yet this weekend. Even a short entry keeps the habit alive.",
      suggestion: "2-minute log: one photo + one topic row.",
    },
  ];
}

const RULES: Array<(ctx: Ctx) => RuleOutput[]> = [
  ritualIncompleteToday,
  logWithoutEvidenceToday,
  logGap,
  lowDailyEvidence,
  noRecentSubjectStudy,
  planBehind,
  testScoreDeclining,
  staleDoubts,
  lowSleepStreak,
  highHoursLowSleep,
  lowEnergyStreak,
  homeworkBacklog,
  weakReflection,
  weekendLogSlip,
];

// --- Evaluator ----------------------------------------------------------

export async function evaluateAlerts(): Promise<{
  active: number;
  red: number;
  warn: number;
  info: number;
}> {
  const ctx = await loadContext();
  const dismissedRows = await prisma.alertDismissal.findMany({
    select: { dedupeKey: true },
  });
  const dismissed = new Set(dismissedRows.map((d) => d.dedupeKey));

  const outputs = RULES.flatMap((rule) => {
    try {
      return rule(ctx);
    } catch (err) {
      console.error("Rule failed:", rule.name, err);
      return [];
    }
  }).filter((o) => !dismissed.has(o.dedupeKey));

  const dedupeKeys = outputs.map((o) => o.dedupeKey);

  // 1. Fetch every potentially-relevant existing row in one query, then
  //    decide create/update in JS. Previously this was N findUnique +
  //    N update/create per dashboard render — painful on SQLite.
  const existingRows = await prisma.alert.findMany({
    where: { dedupeKey: { in: dedupeKeys.length > 0 ? dedupeKeys : ["__nothing__"] } },
  });
  const existingByKey = new Map(existingRows.map((r) => [r.dedupeKey, r]));

  const updates: Array<Promise<unknown>> = [];
  const creates: Array<RuleOutput> = [];

  for (const out of outputs) {
    const existing = existingByKey.get(out.dedupeKey);
    if (!existing) {
      creates.push(out);
      continue;
    }
    const payloadJson = out.payload ? JSON.stringify(out.payload) : null;
    if (existing.resolvedAt) {
      // Re-trigger after resolution: reopen + clear ack.
      updates.push(
        prisma.alert.update({
          where: { id: existing.id },
          data: {
            kind: out.kind,
            severity: out.severity,
            title: out.title,
            body: out.body,
            suggestion: out.suggestion,
            payload: payloadJson,
            resolvedAt: null,
            acknowledgedAt: null,
            acknowledgedBy: null,
          },
        }),
      );
    } else if (
      existing.severity !== out.severity ||
      existing.title !== out.title ||
      existing.body !== out.body ||
      existing.suggestion !== (out.suggestion ?? null) ||
      existing.payload !== payloadJson
    ) {
      // Refresh title/body/etc. in place; preserve acknowledgement.
      updates.push(
        prisma.alert.update({
          where: { id: existing.id },
          data: {
            severity: out.severity,
            title: out.title,
            body: out.body,
            suggestion: out.suggestion,
            payload: payloadJson,
          },
        }),
      );
    }
  }

  if (creates.length > 0) {
    updates.push(
      prisma.alert.createMany({
        data: creates.map((out) => ({
          kind: out.kind,
          severity: out.severity,
          dedupeKey: out.dedupeKey,
          title: out.title,
          body: out.body,
          suggestion: out.suggestion,
          payload: out.payload ? JSON.stringify(out.payload) : null,
        })),
      }),
    );
  }

  // 2. Resolve previously-active alerts whose condition no longer fires.
  const resolveWhere: {
    resolvedAt: null;
    dedupeKey?: { notIn: string[] };
  } = { resolvedAt: null };
  if (dedupeKeys.length > 0) {
    resolveWhere.dedupeKey = { notIn: dedupeKeys };
  }
  updates.push(
    prisma.alert.updateMany({
      where: resolveWhere,
      data: { resolvedAt: new Date() },
    }),
  );

  await Promise.all(updates);

  // 3. Return live counts for the dashboard chrome.
  const active = await prisma.alert.findMany({
    where: { resolvedAt: null, acknowledgedAt: null },
    select: { severity: true },
  });

  return {
    active: active.length,
    red: active.filter((a) => a.severity === "red").length,
    warn: active.filter((a) => a.severity === "warn").length,
    info: active.filter((a) => a.severity === "info").length,
  };
}
