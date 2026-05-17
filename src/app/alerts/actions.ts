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

export type SnoozePreset = "1h" | "tomorrow" | "3d" | "1w" | "clear";

function presetToDate(preset: SnoozePreset): Date | null {
  const now = new Date();
  if (preset === "clear") return null;
  if (preset === "1h") return new Date(now.getTime() + 60 * 60 * 1000);
  if (preset === "3d") return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  if (preset === "1w") return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (preset === "tomorrow") {
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    t.setHours(8, 0, 0, 0);
    return t;
  }
  return null;
}

export async function snoozeAlert(id: string, preset: SnoozePreset) {
  const role = await requireRole(["guardian", "admin"]);
  const until = presetToDate(preset);
  await prisma.alert.update({
    where: { id },
    data: {
      snoozedUntil: until,
      snoozedBy: until ? role : null,
    },
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
      }),
    ),
    prisma.alert.deleteMany({
      where: { resolvedAt: { not: null } },
    }),
  ]);
  revalidateAlertSurfaces();
}

/** Bulk-ack every active alert at or below the given severity (info < warn < red).
 *  Useful when father is catching up after a few days away. */
export async function ackAllAtOrBelow(maxSeverity: "info" | "warn") {
  const role = await requireRole(["guardian", "admin"]);
  const severities = maxSeverity === "info" ? ["info"] : ["info", "warn"];
  await prisma.alert.updateMany({
    where: {
      resolvedAt: null,
      acknowledgedAt: null,
      severity: { in: severities },
    },
    data: { acknowledgedAt: new Date(), acknowledgedBy: role },
  });
  revalidateAlertSurfaces();
}
