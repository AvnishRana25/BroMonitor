// AI first-pass for doubts. Strict prompt — Gemini must say so if it isn't
// confident, because a hallucinated Physics explanation he memorises is
// worse than a doubt that just waits a day for the teacher.
//
// If the doubt has an attached image (snapshot of the question from the
// textbook / worksheet), we send the image bytes to Gemini Vision so it can
// read the problem statement directly. The prompt instructs Gemini to first
// transcribe what it sees, then solve, so we get a self-check on accuracy.

import "server-only";
import { prisma } from "@/lib/db";
import { generateJson } from "./gemini";
import { fetchRemoteImage } from "@/lib/photos";
import { SchemaType, type Schema } from "@google/generative-ai";

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    transcript: {
      type: SchemaType.STRING,
      description:
        "If an image was attached, transcribe the question/problem visible in the image in 1-3 lines. If no image, return empty string.",
    },
    answer: {
      type: SchemaType.STRING,
      description:
        "Step-by-step solution in plain text. Use blank lines between paragraphs and number the steps (Step 1:, Step 2:, ...) when the problem has more than one step. Show small worked calculations inline. Max ~400 words. No markdown headers (#).",
    },
    finalAnswer: {
      type: SchemaType.STRING,
      description:
        "If the doubt has a definite numerical or short final answer, put just that here (e.g. '37.5 m/s' or 'sp3 hybridised'). Empty string for conceptual doubts.",
    },
    confident: {
      type: SchemaType.BOOLEAN,
      description:
        "false if you are not sure about the answer, you cannot read the image clearly, or the doubt is ambiguous. The student is told this is only a first pass and to confirm with a teacher.",
    },
    caveats: {
      type: SchemaType.STRING,
      description:
        "If confident=false, explain what's uncertain or ambiguous. If confident=true, leave empty string.",
    },
  },
  required: ["transcript", "answer", "finalAnswer", "confident", "caveats"],
};

const SYSTEM = `You are a senior Class 11 CBSE / JEE tutor for Physics, Chemistry and Mathematics. You explain ONE specific doubt at a time to a student who is 16-17 years old.

How to answer:
- If an image is attached, first transcribe EVERY visible number, symbol, unit, and diagram label into "transcript" (1-4 lines). Copy subscripts/superscripts as plain text (e.g. v0, H2O, sin30). If handwriting is unclear, transcribe what you can and note ambiguity in caveats.
- Solve the doubt step by step. Each step should be 1-3 sentences. Number the steps "Step 1:", "Step 2:", ... when there is more than one.
- For numerical / Physics / Maths problems: list given values with units, what to find, the formula used, substitution, and arithmetic. Double-check units and significant figures. Put the boxed-style result in "finalAnswer" (e.g. "37.5 m/s" or "2.4 mol").
- Use Class-11 appropriate vocabulary. Define any unusual term in 1 line the first time you use it.
- Show calculations inline (e.g. "v^2 = u^2 + 2as = 0 + 2(9.8)(20) = 392, so v ≈ 19.8 m/s"). Use ^ for exponents, * for multiplication, sqrt() for square root. Avoid LaTeX.
- If a diagram would help, describe it precisely in words (axes, labels, arrows, angles, what is given, what is unknown).
- Plain text only. NO markdown headers (#, ##), NO bullet lists (* / -). Short paragraphs only.

Honesty rules (these matter):
- If the question could mean two different things, name both interpretations and answer the more likely one, but set confident=false.
- If you cannot read a digit in the image, say so — do not guess the number. Set confident=false.
- If you genuinely don't know, set confident=false and explain in caveats. Never fabricate steps or numbers.
- End the answer with one short line: "Confirm with your teacher if anything here feels off."`;

type RawAnswer = {
  transcript: string;
  answer: string;
  finalAnswer: string;
  confident: boolean;
  caveats: string;
};

export async function answerDoubtWithAi(doubtId: string) {
  const doubt = await prisma.doubt.findUnique({
    where: { id: doubtId },
    include: { subject: true },
  });
  if (!doubt) throw new Error("Doubt not found");

  const promptParts = [
    `SUBJECT: ${doubt.subject.name}`,
    `CHAPTER: ${doubt.chapter ?? "(not specified)"}`,
    `TOPIC: ${doubt.topic ?? "(not specified)"}`,
    "",
    "DOUBT (typed by the student):",
    '"""',
    doubt.question.trim() || "(no text typed — see attached image)",
    '"""',
  ];

  const images: Array<{ bytes: Buffer; mime: string }> = [];
  if (doubt.imageUrl) {
    promptParts.push("", "An image of the problem is attached below. Read it carefully.");
    try {
      const img = await fetchRemoteImage(doubt.imageUrl);
      images.push({ bytes: img.bytes, mime: doubt.imageMime || img.mime });
    } catch (e) {
      // Don't fail the whole call — degrade to text-only with a caveat.
      promptParts.push(
        "",
        `(Note: the attached image could not be fetched: ${
          e instanceof Error ? e.message : "unknown error"
        }. Set confident=false and explain in caveats.)`,
      );
    }
  }

  promptParts.push("", "Return the JSON now.");
  const prompt = promptParts.join("\n");

  const { data, model } = await generateJson<RawAnswer>(prompt, {
    schema: SCHEMA,
    systemInstruction: SYSTEM,
    temperature: 0.2,
    images: images.length > 0 ? images : undefined,
  });

  const sections: string[] = [];
  if (data.transcript?.trim()) {
    sections.push(`Question read from image: ${data.transcript.trim()}`);
  }
  if (data.answer?.trim()) sections.push(data.answer.trim());
  if (data.finalAnswer?.trim()) {
    sections.push(`Final answer: ${data.finalAnswer.trim()}`);
  }
  let body = sections.join("\n\n");
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
