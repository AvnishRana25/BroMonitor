"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createTest(formData: FormData) {
  const name = (formData.get("name") as string).trim();
  const dateStr = formData.get("date") as string;
  const type = formData.get("type") as string;
  const source = formData.get("source") as string;
  const rank = formData.get("rank") ? Number(formData.get("rank")) : null;
  const percentile = formData.get("percentile")
    ? Number(formData.get("percentile"))
    : null;
  const notes = ((formData.get("notes") as string) || "").trim() || null;

  const subjects = await prisma.subject.findMany();
  const scores = subjects
    .map((s) => {
      const marksRaw = formData.get(`marks_${s.id}`);
      const maxRaw = formData.get(`max_${s.id}`);
      // Require at least a Max for this subject to count it.
      if (maxRaw == null || maxRaw === "") return null;
      const max = Number(maxRaw);
      if (!Number.isFinite(max) || max <= 0) return null;
      return {
        subjectId: s.id,
        marks: Number(marksRaw || 0),
        maxMarks: max,
        correct: Number(formData.get(`correct_${s.id}`) || 0),
        wrong: Number(formData.get(`wrong_${s.id}`) || 0),
        unattempted: Number(formData.get(`unattempted_${s.id}`) || 0),
        weakTopics:
          ((formData.get(`weak_${s.id}`) as string) || "").trim() || null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (!name || !dateStr) {
    throw new Error("Test name and date are required.");
  }
  if (scores.length === 0) {
    throw new Error("Add marks for at least one subject before saving.");
  }

  const totalMarks = scores.reduce((s, x) => s + x.marks, 0);
  const totalMax = scores.reduce((s, x) => s + x.maxMarks, 0);

  await prisma.test.create({
    data: {
      name,
      date: new Date(dateStr),
      type,
      source,
      totalMarks,
      totalMax,
      rank,
      percentile,
      notes,
      scores: { create: scores },
    },
  });

  // If this matches a scheduled upcoming test (same name + same date), remove it
  await prisma.upcomingTest.deleteMany({
    where: { name, date: new Date(dateStr) },
  });

  revalidatePath("/tests");
  revalidatePath("/");
}

export async function deleteTest(id: string) {
  await prisma.test.delete({ where: { id } });
  revalidatePath("/tests");
  revalidatePath("/");
}

export async function createUpcomingTest(formData: FormData) {
  const name = (formData.get("name") as string).trim();
  const dateStr = formData.get("date") as string;
  const type = formData.get("type") as string;
  const source = formData.get("source") as string;
  const maxMarks = formData.get("maxMarks")
    ? Number(formData.get("maxMarks"))
    : null;
  const durationMinutes = formData.get("durationMinutes")
    ? Number(formData.get("durationMinutes"))
    : null;
  const notes = ((formData.get("notes") as string) || "").trim() || null;
  const preparation =
    ((formData.get("preparation") as string) || "").trim() || null;

  const subjects = await prisma.subject.findMany({
    include: { chapters: true },
  });

  const subjectEntries = subjects
    .map((s) => {
      const included = formData.get(`subject_${s.id}`) === "on";
      if (!included) return null;
      const chapterIds = formData.getAll(`chapters_${s.id}`) as string[];
      const chapterNames = s.chapters
        .filter((c) => chapterIds.includes(c.id))
        .map((c) => c.name);
      return {
        subjectId: s.id,
        chapters: chapterNames.length ? chapterNames.join(", ") : null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  await prisma.upcomingTest.create({
    data: {
      name,
      date: new Date(dateStr),
      type,
      source,
      maxMarks,
      durationMinutes,
      notes,
      preparation,
      subjects: { create: subjectEntries },
    },
  });

  revalidatePath("/tests");
  revalidatePath("/");
}

export async function deleteUpcomingTest(id: string) {
  await prisma.upcomingTest.delete({ where: { id } });
  revalidatePath("/tests");
  revalidatePath("/");
}
