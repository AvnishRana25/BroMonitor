// Weekly report: gather one week of data, send to Gemini, store + email.
// Idempotent on (kind="weekly", scopeKey=YYYY-MM-DD of week's Monday).

import "server-only";
import { prisma } from "@/lib/db";
import {
  addDays,
  fmtDate,
  pct,
  startOfDay,
  toDateInputValue,
  weekStart,
} from "@/lib/utils";
import { generateText } from "./gemini";
import { sendReportEmail, isEmailConfigured } from "./email";

export type WeeklySnapshot = Awaited<ReturnType<typeof gatherWeeklySnapshot>>;

export async function gatherWeeklySnapshot(monday: Date) {
  const sunday = addDays(monday, 6);
  const weekEnd = addDays(sunday, 1); // exclusive end-of-Sunday
  const prevMonday = addDays(monday, -7);

  const [logs, prevLogs, tests, doubtsRaised, doubtsResolved, topics, plan, subjects] =
    await Promise.all([
      prisma.dailyLog.findMany({
        where: { date: { gte: monday, lt: weekEnd } },
        include: {
          entries: { include: { subject: true, chapter: true, topic: true } },
          reflection: true,
          photos: true,
        },
        orderBy: { date: "asc" },
      }),
      prisma.dailyLog.findMany({
        where: { date: { gte: prevMonday, lt: monday } },
      }),
      prisma.test.findMany({
        where: { date: { gte: monday, lt: weekEnd } },
        include: { scores: { include: { subject: true } } },
        orderBy: { date: "asc" },
      }),
      prisma.doubt.count({ where: { raisedAt: { gte: monday, lt: weekEnd } } }),
      prisma.doubt.count({
        where: { resolvedAt: { gte: monday, lt: weekEnd } },
      }),
      prisma.topic.findMany({
        where: { updatedAt: { gte: monday, lt: weekEnd } },
        include: { chapter: { include: { subject: true } } },
      }),
      prisma.studyPlan.findUnique({
        where: { weekStart: monday },
        include: { subjects: { include: { subject: true } } },
      }),
      prisma.subject.findMany({ orderBy: { name: "asc" } }),
    ]);

  // Per-subject hours from log entries: split each log's hours equally across
  // the day's distinct subjects (good-enough heuristic; we don't ask for
  // per-row hours yet).
  const subjectHours = new Map<string, number>();
  for (const sub of subjects) subjectHours.set(sub.id, 0);
  for (const log of logs) {
    const total =
      (log.schoolHours || 0) +
      (log.coachingHours || 0) +
      (log.selfStudyHours || 0);
    if (total <= 0 || log.entries.length === 0) continue;
    const uniqueSubs = Array.from(
      new Set(log.entries.map((e) => e.subjectId))
    );
    const per = total / uniqueSubs.length;
    for (const sid of uniqueSubs) {
      subjectHours.set(sid, (subjectHours.get(sid) ?? 0) + per);
    }
  }

  // Mastered / forward-moved topics this week.
  const mastered = topics.filter((t) => t.status === "mastered");
  const moved = topics.filter((t) => t.status !== "not_started");

  // Day-level breakdown for missed logs / sleep / energy.
  const dayBuckets: Array<{
    date: Date;
    label: string;
    logged: boolean;
    hours: number;
    sleep: number | null;
    energy: number | null;
    photos: number;
  }> = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    const log = logs.find((l) => startOfDay(l.date).getTime() === d.getTime());
    dayBuckets.push({
      date: d,
      label: d.toLocaleDateString("en-IN", { weekday: "short" }),
      logged: !!log,
      hours: log
        ? (log.schoolHours || 0) +
          (log.coachingHours || 0) +
          (log.selfStudyHours || 0)
        : 0,
      sleep: log?.sleepHours ?? null,
      energy: log?.energy ?? null,
      photos: log?.photos.length ?? 0,
    });
  }

  const totalHours = dayBuckets.reduce((s, d) => s + d.hours, 0);
  const prevTotalHours = prevLogs.reduce(
    (s, l) =>
      s + (l.schoolHours || 0) + (l.coachingHours || 0) + (l.selfStudyHours || 0),
    0
  );
  const sleepValues = dayBuckets
    .map((d) => d.sleep)
    .filter((v): v is number => v != null);
  const energyValues = dayBuckets
    .map((d) => d.energy)
    .filter((v): v is number => v != null);

  const chaptersTouched = new Map<string, Set<string>>();
  for (const log of logs) {
    for (const e of log.entries) {
      const key = e.subject.name;
      if (!chaptersTouched.has(key)) chaptersTouched.set(key, new Set());
      const name = e.chapter?.name ?? e.subTopic;
      if (name) chaptersTouched.get(key)!.add(name);
    }
  }

  const testRows = tests.map((t) => ({
    name: t.name,
    pct: pct(t.totalMarks, t.totalMax),
    marks: t.totalMarks,
    max: t.totalMax,
    subjectScores: t.scores.map((s) => ({
      subject: s.subject.short,
      pct: pct(s.marks, s.maxMarks),
    })),
  }));

  const missedDays = dayBuckets.filter((d) => !d.logged).map((d) => d.label);
  const lowEnergyDays = dayBuckets.filter(
    (d) => d.energy != null && d.energy <= 2
  ).length;
  const lowSleepDays = dayBuckets.filter(
    (d) => d.sleep != null && d.sleep < 6
  ).length;
  const noEvidenceDays = dayBuckets.filter(
    (d) => d.logged && d.photos === 0
  ).length;

  const goalHours =
    plan?.totalHoursGoal ??
    (plan ? plan.subjects.reduce((s, x) => s + x.hoursGoal, 0) : null);

  return {
    weekLabel: `${fmtDate(monday)} – ${fmtDate(sunday)}`,
    weekStartIso: toDateInputValue(monday),
    monday,
    sunday,
    totalHours: Number(totalHours.toFixed(2)),
    prevTotalHours: Number(prevTotalHours.toFixed(2)),
    goalHours,
    subjectHours: Array.from(subjectHours.entries()).map(([id, h]) => {
      const sub = subjects.find((s) => s.id === id)!;
      return { subject: sub.name, short: sub.short, hours: Number(h.toFixed(2)) };
    }),
    plannedVsActual:
      plan?.subjects.map((row) => ({
        subject: row.subject.name,
        plannedHours: row.hoursGoal,
        actualHours: Number(
          (subjectHours.get(row.subjectId) ?? 0).toFixed(2)
        ),
      })) ?? [],
    chaptersTouched: Array.from(chaptersTouched.entries()).map(
      ([subject, set]) => ({ subject, chapters: Array.from(set) })
    ),
    masteredTopics: mastered.map((t) => ({
      subject: t.chapter.subject.short,
      chapter: t.chapter.name,
      topic: t.name,
    })),
    forwardMovedCount: moved.length,
    tests: testRows,
    doubtsRaised,
    doubtsResolved,
    daysLogged: dayBuckets.filter((d) => d.logged).length,
    missedDays,
    avgSleep:
      sleepValues.length > 0
        ? Number(
            (sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length).toFixed(
              1
            )
          )
        : null,
    avgEnergy:
      energyValues.length > 0
        ? Number(
            (
              energyValues.reduce((a, b) => a + b, 0) / energyValues.length
            ).toFixed(1)
          )
        : null,
    lowEnergyDays,
    lowSleepDays,
    noEvidenceDays,
    totalEvidence: dayBuckets.reduce((s, d) => s + d.photos, 0),
    reflectionSnippets: logs
      .map((l) => l.reflection)
      .filter((r): r is NonNullable<typeof r> => !!r)
      .map((r) => ({
        learned: r.learned?.slice(0, 200) ?? null,
        confused: r.confused?.slice(0, 200) ?? null,
        hardest: r.hardestSolved?.slice(0, 200) ?? null,
      })),
  };
}

export function buildWeeklyPrompt(snap: Awaited<ReturnType<typeof gatherWeeklySnapshot>>) {
  return `WEEK SNAPSHOT (${snap.weekLabel})

HOURS
- Total logged: ${snap.totalHours}h (prev week: ${snap.prevTotalHours}h)
- Plan goal: ${snap.goalHours ?? "not set"}${snap.goalHours ? "h" : ""}
- Per subject: ${
    snap.subjectHours
      .filter((s) => s.hours > 0)
      .map((s) => `${s.subject} ${s.hours}h`)
      .join(", ") || "(no per-subject hours)"
  }
- Days logged: ${snap.daysLogged}/7${
    snap.missedDays.length > 0 ? ` (missed: ${snap.missedDays.join(", ")})` : ""
  }

PLAN VS ACTUAL
${
  snap.plannedVsActual.length === 0
    ? "(no weekly plan set)"
    : snap.plannedVsActual
        .map(
          (r) =>
            `- ${r.subject}: planned ${r.plannedHours}h, actual ${r.actualHours}h`
        )
        .join("\n")
}

SYLLABUS COVERAGE
${
  snap.chaptersTouched.length === 0
    ? "(no chapters touched)"
    : snap.chaptersTouched
        .map(
          (c) =>
            `- ${c.subject}: ${
              c.chapters.length === 0 ? "(none)" : c.chapters.join("; ")
            }`
        )
        .join("\n")
}

TOPICS MASTERED THIS WEEK (${snap.masteredTopics.length})
${
  snap.masteredTopics.length === 0
    ? "(none)"
    : snap.masteredTopics
        .map((t) => `- ${t.subject}: ${t.chapter} → ${t.topic}`)
        .join("\n")
}
Other topics moved forward in status: ${
    Math.max(0, snap.forwardMovedCount - snap.masteredTopics.length)
  }

TESTS THIS WEEK (${snap.tests.length})
${
  snap.tests.length === 0
    ? "(none)"
    : snap.tests
        .map(
          (t) =>
            `- ${t.name}: ${t.marks}/${t.max} (${t.pct}%)${
              t.subjectScores.length
                ? " — " +
                  t.subjectScores.map((s) => `${s.subject} ${s.pct}%`).join(", ")
                : ""
            }`
        )
        .join("\n")
}

DOUBTS: raised ${snap.doubtsRaised}, resolved ${snap.doubtsResolved}

WELLBEING
- Sleep avg: ${snap.avgSleep ?? "not logged"}${snap.avgSleep ? "h" : ""}, days under 6h: ${snap.lowSleepDays}
- Energy avg: ${snap.avgEnergy ?? "not rated"}${snap.avgEnergy ? "/5" : ""}, days ≤2: ${snap.lowEnergyDays}
- Evidence photos this week: ${snap.totalEvidence}, days logged without any photo: ${snap.noEvidenceDays}

REFLECTION SNIPPETS (${snap.reflectionSnippets.length})
${
  snap.reflectionSnippets.length === 0
    ? "(none — reflection fields empty)"
    : snap.reflectionSnippets
        .map(
          (r, i) =>
            `[${i + 1}] learned="${r.learned ?? "—"}" confused="${
              r.confused ?? "—"
            }" hardest="${r.hardest ?? "—"}"`
        )
        .join("\n")
}`;
}

const WEEKLY_SYSTEM = `You are a senior study coach reviewing one week for a Class 11 CBSE student preparing for JEE.

Audience: the student's father. Reads on his phone in 2 minutes.

Style:
- Direct, factual, parental but not harsh.
- 180-220 words total. Plain prose paragraphs only — no markdown headers, no emojis, no motivational filler.
- Refer to the student as "he".
- Use only the numbers and items in the snapshot. Never invent data. If something is missing, name what is missing rather than guessing.
- Never use vague phrases like "do better" or "stay consistent". Every claim must cite something concrete from the snapshot.

Required structure (4 short paragraphs):
1) One sentence verdict on what kind of week this objectively was (strong / inconsistent / light / front-loaded / declining etc.) and why.
2) One genuine strength — name the subject/topic/test/score and what makes it a strength.
3) One genuine concern — name the specific gap (a subject, a missed log streak, a slipping test, a stalled chapter, low sleep streak).
4) ONE specific action for the upcoming week that father can enforce. Must be concrete enough to schedule (e.g. "Block 90 min on Sat morning for Maths Trigonometry — 15 problems from NCERT Ch 3"). Not "study more".

If the week has clearly insufficient data (e.g. fewer than 3 days logged), say that plainly in paragraph 1 and make paragraph 4 about restoring logging discipline first.`;

export async function generateAndStoreWeeklyReport(opts: {
  monday?: Date;
  overwrite?: boolean;
} = {}) {
  const monday = startOfDay(opts.monday ?? weekStart(addDays(new Date(), -1)));
  const scopeKey = toDateInputValue(monday);

  if (!opts.overwrite) {
    const existing = await prisma.aiReport.findUnique({
      where: { kind_scopeKey: { kind: "weekly", scopeKey } },
    });
    if (existing) return { report: existing, regenerated: false };
  }

  const snap = await gatherWeeklySnapshot(monday);
  const prompt = buildWeeklyPrompt(snap);
  const { text, tokensIn, tokensOut, model } = await generateText(prompt, {
    systemInstruction: WEEKLY_SYSTEM,
    temperature: 0.3,
  });

  const title = `Weekly report — ${snap.weekLabel}`;
  const report = await prisma.aiReport.upsert({
    where: { kind_scopeKey: { kind: "weekly", scopeKey } },
    create: {
      kind: "weekly",
      scopeKey,
      title,
      body: text,
      metadata: JSON.stringify(snap),
      model,
      tokensIn,
      tokensOut,
    },
    update: {
      title,
      body: text,
      metadata: JSON.stringify(snap),
      model,
      tokensIn,
      tokensOut,
      generatedAt: new Date(),
      emailedAt: null,
      emailedTo: null,
    },
  });
  return { report, regenerated: true };
}

export async function emailWeeklyReport(
  reportId: string,
): Promise<{ sent: boolean; to: string; reason?: string }> {
  const report = await prisma.aiReport.findUnique({ where: { id: reportId } });
  if (!report) throw new Error("Report not found");
  if (!isEmailConfigured()) {
    return {
      sent: false,
      to: "(unset)",
      reason:
        "Email is not configured. Add SMTP_* and REPORT_EMAIL_* values in .env.",
    };
  }
  const result = await sendReportEmail({
    subject: `[BroMonitor] ${report.title}`,
    text: report.body,
  });
  if (result.sent) {
    await prisma.aiReport.update({
      where: { id: reportId },
      data: { emailedAt: new Date(), emailedTo: result.to },
    });
  }
  return result;
}
