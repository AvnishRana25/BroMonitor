// AI first-pass for doubts. Strict prompt — Gemini must say so if it isn't
// confident, because a hallucinated Physics explanation he memorises is
// worse than a doubt that just waits a day for the teacher.

import "server-only";
import { prisma } from "@/lib/db";
import { generateJson } from "./gemini";
import { SchemaType, type Schema } from "@google/generative-ai";

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    answer: {
      type: SchemaType.STRING,
      description:
        "The explanation in plain text. If the doubt needs a diagram, describe it in words. Max ~300 words. Use line breaks between paragraphs. No markdown headers.",
    },
    confident: {
      type: SchemaType.BOOLEAN,
      description:
        "false if you are not sure about the answer or the doubt is ambiguous; the student is told this is only a first pass and to confirm with a teacher.",
    },
    caveats: {
      type: SchemaType.STRING,
      description:
        "If confident=false, explain what's uncertain or ambiguous. If confident=true, leave empty string.",
    },
  },
  required: ["answer", "confident", "caveats"],
};

const SYSTEM = `You are a Class 11 CBSE Physics / Chemistry / Maths tutor explaining a single doubt to a JEE-aspirant student.

Rules:
- Answer ONLY the specific doubt asked. Don't lecture the whole chapter.
- Use simple language a Class 11 student understands. Show small worked steps when a calculation is involved.
- If the doubt requires a diagram, describe it in clear words (axes, labels, arrows, angles).
- Use plain text. NO markdown headers (#), NO bullet lists (* / -). Short paragraphs only. Inline math with simple notation like v^2 = u^2 + 2as.
- If anything is ambiguous, or you are not certain (e.g. the question could mean two things, or the chapter context is wrong), set confident=false and explain why in caveats. Do NOT guess in that case — give your best partial explanation and clearly flag the uncertainty.
- Never claim to be the final authority. End the answer with one short line: "Confirm with your teacher if anything here feels off."`;

type RawAnswer = {
  answer: string;
  confident: boolean;
  caveats: string;
};

export async function answerDoubtWithAi(doubtId: string) {
  const doubt = await prisma.doubt.findUnique({
    where: { id: doubtId },
    include: { subject: true },
  });
  if (!doubt) throw new Error("Doubt not found");

  const prompt = `SUBJECT: ${doubt.subject.name}
CHAPTER: ${doubt.chapter ?? "(not specified)"}
TOPIC: ${doubt.topic ?? "(not specified)"}

DOUBT:
"""
${doubt.question.trim()}
"""

Return the JSON now.`;

  const { data, model } = await generateJson<RawAnswer>(prompt, {
    schema: SCHEMA,
    systemInstruction: SYSTEM,
    temperature: 0.3,
  });

  let body = data.answer.trim();
  if (!data.confident && data.caveats?.trim()) {
    body = `[AI flagged low confidence] ${data.caveats.trim()}\n\n${body}`;
  }

  await prisma.doubt.update({
    where: { id: doubtId },
    data: {
      aiAnswer: body,
      aiConfident: data.confident,
      aiAnsweredAt: new Date(),
      aiModel: model,
    },
  });

  return { answer: body, confident: data.confident };
}

export async function resolveDoubtByAi(doubtId: string) {
  const doubt = await prisma.doubt.findUnique({ where: { id: doubtId } });
  if (!doubt) throw new Error("Doubt not found");
  if (!doubt.aiAnswer) throw new Error("No AI answer to mark as resolved.");
  await prisma.doubt.update({
    where: { id: doubtId },
    data: {
      status: "resolved",
      resolvedAt: new Date(),
      resolvedBy: "ai",
    },
  });
}
