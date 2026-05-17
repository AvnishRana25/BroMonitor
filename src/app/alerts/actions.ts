"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { evaluateAlerts } from "@/lib/rules";

function revalidateAlertSurfaces() {
  revalidatePath("/alerts");
  revalidatePath("/");
}

export async function ackAlert(id: string) {
  const role = await requireRole(["guardian", "admin"]);
  await prisma.alert.update({
    where: { id },
    data: {
      acknowledgedAt: new Date(),
      acknowledgedBy: role,
    },
  });
  revalidateAlertSurfaces();
}

export async function unackAlert(id: string) {
  await requireRole(["guardian", "admin"]);
  await prisma.alert.update({
    where: { id },
    data: { acknowledgedAt: null, acknowledgedBy: null },
  });
  revalidateAlertSurfaces();
}

/** Permanently remove an alert and suppress its dedupeKey from reappearing. */
export async function deleteAlert(id: string) {
  const role = await requireRole(["admin"]); // admin-only permanent delete
  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert) return;

  await prisma.$transaction([
    prisma.alertDismissal.upsert({
      where: { dedupeKey: alert.dedupeKey },
      create: { dedupeKey: alert.dedupeKey, dismissedBy: role },
      update: { dismissedAt: new Date(), dismissedBy: role },
    }),
    prisma.alert.delete({ where: { id } }),
  ]);
  revalidateAlertSurfaces();
}

export async function reevaluate() {
  await requireRole(["guardian", "admin"]);
  await evaluateAlerts();
  revalidateAlertSurfaces();
}

export async function clearResolved() {
  await requireRole(["admin"]);
  const resolved = await prisma.alert.findMany({
    where: { resolvedAt: { not: null } },
    select: { dedupeKey: true },
  });
  if (resolved.length === 0) return;

  await prisma.$transaction([
    ...resolved.map((a) =>
      prisma.alertDismissal.upsert({
        where: { dedupeKey: a.dedupeKey },
        create: { dedupeKey: a.dedupeKey, dismissedBy: "admin" },
        update: { dismissedAt: new Date(), dismissedBy: "admin" },
      })
    ),
    prisma.alert.deleteMany({
      where: { resolvedAt: { not: null } },
    }),
  ]);
  revalidateAlertSurfaces();
}
