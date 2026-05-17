// Monthly synthesis: month-over-month trends across hours, mastery, tests,
// consistency. Pure narrative — reads existing data, no new logging.

import "server-only";
import { prisma } from "@/lib/db";
import { addDays, fmtDate, pct, startOfDay } from "@/lib/utils";
import { generateText } from "./gemini";
import { sendReportEmail, isEmailConfigured } from "./email";

function monthBounds(year: number, month: number) {
  // month is 1-12.
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);
  return { start, end };
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function gatherMonthlySnapshot(year: number, month: number) {
  const { start, end } = monthBounds(year, month);
  const prev = monthBounds(
    month === 1 ? year - 1 : year,
    month === 1 ? 12 : month - 1
  );

  const [logs, prevLogs, tests, prevTests, topics] = await Promise.all([
    prisma.dailyLog.findMany({
      where: { date: { gte: start, lt: end } },
      include: { entries: { include: { subject: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.dailyLog.findMany({
      where: { date: { gte: prev.start, lt: prev.end } },
    }),
    prisma.test.findMany({
      where: { date: { gte: start, lt: end } },
      include: { scores: { include: { subject: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.test.findMany({
      where: { date: { gte: prev.start, lt: prev.end } },
    }),
    prisma.topic.findMany({
      where: { updatedAt: { gte: start, lt: end } },
      include: { chapter: { include: { subject: true } } },
    }),
  ]);

  const sumHours = (
    arr: Array<{
      schoolHours: number;
      coachingHours: number;
      selfStudyHours: number;
    }>,
  ) =>
    arr.reduce(
      (s, l) =>
        s +
        (l.schoolHours || 0) +
        (l.coachingHours || 0) +
        (l.selfStudyHours || 0),
      0,
    );

  const totalHours = Number(sumHours(logs).toFixed(2));
  const prevHours = Number(sumHours(prevLogs).toFixed(2));

  // Consistency: longest streak of consecutive days logged.
  const loggedSet = new Set(
    logs.map((l) => startOfDay(l.date).getTime())
  );
  const totalDays = Math.round((+end - +start) / 86400000);
  let bestStreak = 0;
  let run = 0;
  for (let i = 0; i < totalDays; i++) {
    const d = addDays(start, i).getTime();
    if (loggedSet.has(d)) {
      run++;
      bestStreak = Math.max(bestStreak, run);
    } else {
      run = 0;
    }
  }

  const subjectHours = new Map<string, number>();
  for (const log of logs) {
    const total =
      (log.schoolHours || 0) +
      (log.coachingHours || 0) +
      (log.selfStudyHours || 0);
    if (total <= 0 || log.entries.length === 0) continue;
    const uniqueSubs = Array.from(new Set(log.entries.map((e) => e.subjectId)));
    const per = total / uniqueSubs.length;
    for (const sid of uniqueSubs) {
      const sub = log.entries.find((e) => e.subjectId === sid)!.subject;
      subjectHours.set(sub.name, (subjectHours.get(sub.name) ?? 0) + per);
    }
  }

  const testPcts = tests.map((t) => ({
    name: t.name,
    pct: pct(t.totalMarks, t.totalMax),
  }));
  const prevTestAvg =
    prevTests.length > 0
      ? Math.round(
          prevTests.reduce((s, t) => s + pct(t.totalMarks, t.totalMax), 0) /
            prevTests.length
        )
      : null;
  const currTestAvg =
    tests.length > 0
      ? Math.round(testPcts.reduce((s, t) => s + t.pct, 0) / tests.length)
      : null;

  const mastered = topics.filter((t) => t.status === "mastered").length;
  const inProgress = topics.filter(
    (t) => t.status !== "not_started" && t.status !== "mastered"
  ).length;

  const monthName = start.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return {
    monthKey: monthKey(start),
    monthName,
    daysLogged: logs.length,
    totalDays,
    bestStreak,
    totalHours,
    prevHours,
    hoursDelta: Number((totalHours - prevHours).toFixed(2)),
    subjectHours: Array.from(subjectHours.entries()).map(([subject, h]) => ({
      subject,
      hours: Number(h.toFixed(2)),
    })),
    tests: testPcts,
    avgTestPct: currTestAvg,
    prevAvgTestPct: prevTestAvg,
    topicsMastered: mastered,
    topicsInProgress: inProgress,
  };
}

export function buildMonthlyPrompt(
  snap: Awaited<ReturnType<typeof gatherMonthlySnapshot>>
) {
  return `MONTH SNAPSHOT (${snap.monthName})

CONSISTENCY
- Days logged: ${snap.daysLogged} / ${snap.totalDays}
- Longest unbroken logging streak: ${snap.bestStreak} days

HOURS
- This month total: ${snap.totalHours}h
- Last month total: ${snap.prevHours}h
- Delta: ${snap.hoursDelta > 0 ? "+" : ""}${snap.hoursDelta}h
- Per subject this month: ${
    snap.subjectHours.length === 0
      ? "(none)"
      : snap.subjectHours.map((s) => `${s.subject} ${s.hours}h`).join(", ")
  }

TESTS
${
  snap.tests.length === 0
    ? "(no tests logged this month)"
    : snap.tests.map((t) => `- ${t.name}: ${t.pct}%`).join("\n")
}
- Avg this month: ${snap.avgTestPct ?? "n/a"}%, last month avg: ${
    snap.prevAvgTestPct ?? "n/a"
  }%

MASTERY
- Topics mastered this month: ${snap.topicsMastered}
- Topics actively moved (not mastered): ${snap.topicsInProgress}`;
}

const MONTHLY_SYSTEM = `You are a senior study coach writing a monthly review of a Class 11 JEE student.

Audience: the student's father.

Style:
- Synthesis, not data dump. 250-300 words, plain prose paragraphs.
- Compare month-over-month for hours and test averages. Name the deltas explicitly.
- No markdown headers, no bullets except an optional final list of 1-3 action items at the end.
- Refer to the student as "he".
- Use only the numbers in the snapshot. Don't invent. If a metric is missing or n/a, say so.

Required structure:
1) One paragraph: overall trajectory of the month vs prior — improving, flat, regressing, mixed. Cite hours delta and test average delta if available.
2) One paragraph: subject balance — which subject got the most/least time, whether that matches priorities for JEE.
3) One paragraph: mastery & consistency — topics mastered, longest streak, drop-off patterns.
4) Optional final list (max 3 lines): "Next month focus:" with concrete, schedulable items.`;

export async function generateAndStoreMonthlyReport(opts: {
  year?: number;
  month?: number; // 1-12
  overwrite?: boolean;
} = {}) {
  // Default to last completed calendar month.
  const now = new Date();
  let year = opts.year ?? now.getFullYear();
  let month = opts.month ?? now.getMonth(); // getMonth is 0-11, so this is last month.
  if (!opts.month) {
    if (month === 0) {
      month = 12;
      year = year - 1;
    }
  }

  const snap = await gatherMonthlySnapshot(year, month);

  if (!opts.overwrite) {
    const existing = await prisma.aiReport.findUnique({
      where: { kind_scopeKey: { kind: "monthly", scopeKey: snap.monthKey } },
    });
    if (existing) return { report: existing, regenerated: false };
  }

  const prompt = buildMonthlyPrompt(snap);
  const { text, tokensIn, tokensOut, model } = await generateText(prompt, {
    systemInstruction: MONTHLY_SYSTEM,
    temperature: 0.3,
  });

  const title = `Monthly review — ${snap.monthName}`;
  const report = await prisma.aiReport.upsert({
    where: { kind_scopeKey: { kind: "monthly", scopeKey: snap.monthKey } },
    create: {
      kind: "monthly",
      scopeKey: snap.monthKey,
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

export async function emailMonthlyReport(
  reportId: string,
): Promise<{ sent: boolean; to: string; reason?: string }> {
  const report = await prisma.aiReport.findUnique({ where: { id: reportId } });
  if (!report) throw new Error("Report not found");
  if (!isEmailConfigured()) {
    return {
      sent: false,
      to: "(unset)",
      reason: "Email is not configured.",
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

export { monthKey };
