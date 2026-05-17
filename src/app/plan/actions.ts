"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { parseLocalDate, weekStart } from "@/lib/utils";

export async function upsertStudyPlan(formData: FormData) {
  await requireRole(["guardian", "admin"]);

  const weekStartStr = String(formData.get("weekStart") || "");
  if (!weekStartStr) throw new Error("weekStart is required");
  const monday = weekStart(parseLocalDate(weekStartStr));

  const totalRaw = formData.get("totalHoursGoal");
  const totalHoursGoal =
    totalRaw == null || totalRaw === "" ? null : Number(totalRaw);
  const testsGoal = Number(formData.get("testsGoal") || 0);
  const revisionSessionsGoal = Number(
    formData.get("revisionSessionsGoal") || 0
  );
  const notes = ((formData.get("notes") as string) || "").trim() || null;

  const subjects = await prisma.subject.findMany();
  const subjectEntries: Array<{ subjectId: string; hoursGoal: number }> = [];
  for (const s of subjects) {
    const raw = formData.get(`subject_${s.id}`);
    const hours = raw == null || raw === "" ? 0 : Number(raw);
    subjectEntries.push({ subjectId: s.id, hoursGoal: Math.max(0, hours) });
  }

  const plan = await prisma.studyPlan.upsert({
    where: { weekStart: monday },
    update: {
      totalHoursGoal,
      testsGoal,
      revisionSessionsGoal,
      notes,
      subjects: { deleteMany: {} },
    },
    create: {
      weekStart: monday,
      totalHoursGoal,
      testsGoal,
      revisionSessionsGoal,
      notes,
    },
  });

  await prisma.studyPlanSubject.createMany({
    data: subjectEntries.map((e) => ({ ...e, studyPlanId: plan.id })),
  });

  revalidatePath("/plan");
  revalidatePath("/");
}

export async function deleteStudyPlan(id: string) {
  await requireRole(["admin"]);
  await prisma.studyPlan.delete({ where: { id } });
  revalidatePath("/plan");
  revalidatePath("/");
}
