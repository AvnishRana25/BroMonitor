// Smart log: one free-text line → structured daily-log fields.
// Uses Gemini JSON mode with a constrained response schema and the live list
// of subjects + chapters so it can map natural names to DB IDs.

import "server-only";
import { prisma } from "@/lib/db";
import { generateJson } from "./gemini";
import { SchemaType, type Schema } from "@google/generative-ai";

export type ParsedEntry = {
  subjectId: string;
  subjectName: string;
  chapterId: string | null;
  chapterName: string | null;
  topicId: string | null;
  topicName: string | null;
  source: "school" | "coaching" | "self";
  problemsSolved: number;
  homeworkDone: boolean;
  notes: string | null;
};

export type ParsedLog = {
  schoolHours: number;
  coachingHours: number;
  selfStudyHours: number;
  sleepHours: number | null;
  energy: number | null;
  notes: string | null;
  reflection: {
    learned: string | null;
    confused: string | null;
    hardestSolved: string | null;
  };
  entries: ParsedEntry[];
  unmatched: string[]; // free-text items Gemini couldn't map to subjects
};

// Internal raw shape from Gemini before resolving names → IDs.
type RawEntry = {
  subject: string;
  chapter?: string | null;
  topic?: string | null;
  source: "school" | "coaching" | "self";
  problems_solved: number;
  homework_done: boolean;
  notes?: string | null;
};

type RawResponse = {
  school_hours: number;
  coaching_hours: number;
  self_study_hours: number;
  sleep_hours?: number | null;
  energy?: number | null;
  notes?: string | null;
  reflection_learned?: string | null;
  reflection_confused?: string | null;
  reflection_hardest?: string | null;
  entries: RawEntry[];
  unmatched: string[];
};

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    school_hours: { type: SchemaType.NUMBER, description: "Hours at school today, 0 if unknown." },
    coaching_hours: { type: SchemaType.NUMBER, description: "Hours at coaching today, 0 if unknown." },
    self_study_hours: { type: SchemaType.NUMBER, description: "Self-study hours, 0 if unknown." },
    sleep_hours: { type: SchemaType.NUMBER, description: "Sleep hours last night, null if not mentioned.", nullable: true },
    energy: { type: SchemaType.INTEGER, description: "Energy 1-5, null if not mentioned.", nullable: true },
    notes: { type: SchemaType.STRING, description: "General notes for the day, null if none.", nullable: true },
    reflection_learned: { type: SchemaType.STRING, nullable: true },
    reflection_confused: { type: SchemaType.STRING, nullable: true },
    reflection_hardest: { type: SchemaType.STRING, nullable: true },
    entries: {
      type: SchemaType.ARRAY,
      description:
        "One row per distinct subject + chapter studied today. Use the EXACT subject name from the SUBJECTS list. If a chapter is mentioned, copy the closest name from the CHAPTERS list under that subject; otherwise leave chapter null. If a topic name is given, put it in topic.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          subject: { type: SchemaType.STRING },
          chapter: { type: SchemaType.STRING, nullable: true },
          topic: { type: SchemaType.STRING, nullable: true },
          source: {
            type: SchemaType.STRING,
            description: "school | coaching | self",
            enum: ["school", "coaching", "self"],
            format: "enum",
          },
          problems_solved: { type: SchemaType.INTEGER },
          homework_done: { type: SchemaType.BOOLEAN },
          notes: { type: SchemaType.STRING, nullable: true },
        },
        required: [
          "subject",
          "source",
          "problems_solved",
          "homework_done",
        ],
      },
    },
    unmatched: {
      type: SchemaType.ARRAY,
      description:
        "Any items the user mentioned that you could not confidently map to a known subject. Empty if none.",
      items: { type: SchemaType.STRING },
    },
  },
  required: [
    "school_hours",
    "coaching_hours",
    "self_study_hours",
    "entries",
    "unmatched",
  ],
};

const SYSTEM = `You convert a Class 11 JEE student's one-line daily summary into structured fields for his daily log form.

Rules:
- Output JSON matching the provided schema. No prose, no markdown.
- Hours: if not mentioned, use 0. Never invent hours.
- Subject names MUST exactly match one entry from the SUBJECTS list given by the user. If the student says "phy" → "Physics", "chem" → "Chemistry", "math" / "maths" → "Mathematics". If no match, do not include the entry — put the original phrase in "unmatched" instead.
- Chapter: copy the closest CHAPTERS entry under the chosen subject (case-insensitive substring match is fine). If no clear match, leave chapter null and put the topic into "topic".
- If the student says something like "homework pending" or "hw not done" → set homework_done=false on the relevant entry, optionally a separate row with the same chapter.
- Source defaults to "school" if the line says school, "coaching" if it says coaching/class, "self" otherwise.
- Do not include subjects the student did not study today.
- Reflection fields are optional. Only fill if the student clearly expressed what they learned / what confused them / hardest problem.`;

export async function parseDailyLogFromText(input: {
  text: string;
}): Promise<ParsedLog> {
  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    include: {
      chapters: {
        orderBy: { name: "asc" },
        include: { topics: { orderBy: { name: "asc" } } },
      },
    },
  });

  const subjectsList = subjects.map((s) => s.name).join(", ");
  const chaptersList = subjects
    .map(
      (s) =>
        `- ${s.name}: ${s.chapters.map((c) => c.name).join(", ") || "(no chapters)"}`
    )
    .join("\n");

  const prompt = `SUBJECTS (use the exact name):
${subjectsList}

CHAPTERS PER SUBJECT (pick the closest one if mentioned):
${chaptersList}

STUDENT'S ONE-LINE SUMMARY:
"""
${input.text.trim()}
"""

Return the JSON now.`;

  const { data } = await generateJson<RawResponse>(prompt, {
    schema: SCHEMA,
    systemInstruction: SYSTEM,
    temperature: 0.1,
  });

  const entries: ParsedEntry[] = [];
  for (const e of data.entries) {
    const sub = subjects.find(
      (s) => s.name.toLowerCase() === (e.subject || "").toLowerCase()
    );
    if (!sub) {
      data.unmatched.push(e.subject);
      continue;
    }
    let chapter = null as null | (typeof sub.chapters)[number];
    if (e.chapter) {
      const target = e.chapter.toLowerCase().trim();
      chapter =
        sub.chapters.find((c) => c.name.toLowerCase() === target) ??
        sub.chapters.find((c) => c.name.toLowerCase().includes(target)) ??
        sub.chapters.find((c) => target.includes(c.name.toLowerCase())) ??
        null;
    }
    let topic = null as null | (typeof sub.chapters)[number]["topics"][number];
    if (e.topic && chapter) {
      const target = e.topic.toLowerCase().trim();
      topic =
        chapter.topics.find((t) => t.name.toLowerCase() === target) ??
        chapter.topics.find((t) => t.name.toLowerCase().includes(target)) ??
        null;
    }
    entries.push({
      subjectId: sub.id,
      subjectName: sub.name,
      chapterId: chapter?.id ?? null,
      chapterName: chapter?.name ?? e.chapter ?? null,
      topicId: topic?.id ?? null,
      topicName: topic?.name ?? e.topic ?? null,
      source: e.source,
      problemsSolved: Math.max(0, Math.floor(e.problems_solved || 0)),
      homeworkDone: !!e.homework_done,
      notes: (e.notes ?? "").trim() || null,
    });
  }

  return {
    schoolHours: Math.max(0, Number(data.school_hours) || 0),
    coachingHours: Math.max(0, Number(data.coaching_hours) || 0),
    selfStudyHours: Math.max(0, Number(data.self_study_hours) || 0),
    sleepHours:
      data.sleep_hours == null ? null : Math.max(0, Number(data.sleep_hours)),
    energy:
      data.energy == null
        ? null
        : Math.min(5, Math.max(1, Math.round(Number(data.energy)))),
    notes: (data.notes ?? "").trim() || null,
    reflection: {
      learned: (data.reflection_learned ?? "").trim() || null,
      confused: (data.reflection_confused ?? "").trim() || null,
      hardestSolved: (data.reflection_hardest ?? "").trim() || null,
    },
    entries,
    unmatched: data.unmatched.filter(Boolean),
  };
}
