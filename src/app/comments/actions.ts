"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { parseLocalDate, startOfDay } from "@/lib/utils";

export type CreateCommentInput = {
  scope: "general" | "day";
  scopeId?: string | null;
  scopeDate?: string | null; // YYYY-MM-DD when scope=day
  body: string;
};

export async function createGuardianComment(input: CreateCommentInput) {
  const role = await requireRole(["guardian", "admin"]);
  const body = input.body.trim();
  if (!body) return;
  if (body.length > 2000) {
    throw new Error("Comment too long. Keep it under 2000 characters.");
  }

  let scopeId: string | null = input.scopeId ?? null;
  let scopeDate: Date | null = null;
  if (input.scope === "day" && input.scopeDate) {
    scopeDate = startOfDay(parseLocalDate(input.scopeDate));
    // Snap scopeId to the dailyLog if it exists (handy for joins later).
    const log = await prisma.dailyLog.findUnique({
      where: { date: scopeDate },
      select: { id: true },
    });
    scopeId = log?.id ?? null;
  }

  await prisma.guardianComment.create({
    data: {
      authorRole: role,
      scope: input.scope,
      scopeId,
      scopeDate,
      body,
    },
  });

  revalidatePath("/");
  revalidatePath("/daily");
}

export async function deleteGuardianComment(id: string) {
  await requireRole(["admin"]);
  await prisma.guardianComment.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/daily");
}
