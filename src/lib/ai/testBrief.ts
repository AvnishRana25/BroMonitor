// Pre-test brief: 7-day focused plan for an upcoming test.
// Generated on-demand, cached on AiReport with scopeKey = upcomingTestId.

import "server-only";
import { prisma } from "@/lib/db";
import { generateText } from "./gemini";

export async function gatherTestBriefSnapshot(upcomingTestId: string) {
  const test = await prisma.upcomingTest.findUnique({
    where: { id: upcomingTestId },
    include: {
      subjects: {
        include: {
          subject: {
            include: {
              chapters: {
                include: { topics: true },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
    },
  });
  if (!test) throw new Error("Upcoming test not found");

  const now = new Date();
  const daysAway = Math.max(
    0,
    Math.ceil((test.date.getTime() - now.getTime()) / 86400000)
  );

  // For each subject in the syllabus, list the chapters named in `chapters`
  // (comma-separated free text) and pull the matching Topic rows for status.
  const subjectChunks = test.subjects.map((row) => {
    const wantedChapterNames = (row.chapters || "")
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const includeAll = wantedChapterNames.length === 0;
    const filtered = row.subject.chapters.filter((ch) =>
      includeAll
        ? true
        : wantedChapterNames.some(
            (n) => ch.name.toLowerCase() === n.toLowerCase()
          )
    );
    return {
      subject: row.subject.name,
      short: row.subject.short,
      chapters: filtered.map((ch) => ({
        name: ch.name,
        topics: ch.topics.map((t) => ({
          name: t.name,
          status: t.status,
          confidence: t.confidence,
          mistakes: t.mistakes,
          problemsSolved: t.problemsSolved,
        })),
      })),
    };
  });

  return {
    testId: test.id,
    name: test.name,
    type: test.type,
    source: test.source,
    date: test.date,
    daysAway,
    maxMarks: test.maxMarks,
    durationMinutes: test.durationMinutes,
    notes: test.notes,
    subjects: subjectChunks,
  };
}

export function buildTestBriefPrompt(
  snap: Awaited<ReturnType<typeof gatherTestBriefSnapshot>>
) {
  return `UPCOMING TEST
- Name: ${snap.name}
- Type: ${snap.type} (${snap.source})
- Date: ${snap.date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  })} (${snap.daysAway} days away)
- Max marks: ${snap.maxMarks ?? "n/a"}, duration: ${
    snap.durationMinutes ?? "n/a"
  } min
- Notes: ${snap.notes ?? "(none)"}

SYLLABUS WITH STUDENT'S CURRENT STATE
${snap.subjects
  .map(
    (s) =>
      `- ${s.subject}\n` +
      (s.chapters.length === 0
        ? "  (no chapters defined for this subject in DB)"
        : s.chapters
            .map(
              (ch) =>
                `  • ${ch.name}\n` +
                (ch.topics.length === 0
                  ? "    (no topics)"
                  : ch.topics
                      .map(
                        (t) =>
                          `    - ${t.name}: status=${t.status}, confidence=${t.confidence}/5, mistakes=${t.mistakes}, problems=${t.problemsSolved}`
                      )
                      .join("\n"))
            )
            .join("\n"))
  )
  .join("\n")}`;
}

const TEST_BRIEF_SYSTEM = `You are a JEE coach building a focused ${"prep"} brief for a Class 11 CBSE student.

You will be given an upcoming test (name, syllabus, days away) and the student's current state for each topic (status, confidence, mistakes).

Your task: rank topics by URGENCY for the remaining days, then give a concrete day-by-day plan.

How to rank urgency (highest to lowest):
1) Topics not_started or class_taught in subjects that historically carry high JEE weightage.
2) Topics with high mistakes or low confidence in the syllabus.
3) Topics marked self_studied but with 0 problems solved.
4) Topics already revised or mastered → revision only, lowest urgency.

Output rules:
- Use ONLY topics that appear in the syllabus provided. Do not invent topics or chapters.
- 350-450 words max.
- Plain text. Use short bold-style labels (e.g. "DAY 1 (Mon):") on their own line, followed by the plan for that day.
- Each day's plan must name specific topics from the input and what activity ("learn theory", "solve 15 NCERT", "revise and self-test").
- Reserve the FINAL day before the test for revision + a timed mock if possible.
- Begin with a 2-3 sentence "Reality check" paragraph saying where he stands and what the biggest gap is.
- End with a one-line "Do this first today:" pointing at the single most urgent action.`;

export async function generateAndStoreTestBrief(opts: {
  upcomingTestId: string;
  overwrite?: boolean;
}) {
  const scopeKey = opts.upcomingTestId;

  if (!opts.overwrite) {
    const existing = await prisma.aiReport.findUnique({
      where: { kind_scopeKey: { kind: "test_brief", scopeKey } },
    });
    if (existing) return { report: existing, regenerated: false };
  }

  const snap = await gatherTestBriefSnapshot(opts.upcomingTestId);
  const prompt = buildTestBriefPrompt(snap);
  const { text, tokensIn, tokensOut, model } = await generateText(prompt, {
    systemInstruction: TEST_BRIEF_SYSTEM,
    temperature: 0.25,
  });

  const title = `Test brief — ${snap.name} (${snap.daysAway}d away)`;
  const report = await prisma.aiReport.upsert({
    where: { kind_scopeKey: { kind: "test_brief", scopeKey } },
    create: {
      kind: "test_brief",
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
    },
  });
  return { report, regenerated: true };
}
