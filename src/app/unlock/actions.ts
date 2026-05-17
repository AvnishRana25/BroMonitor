"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ALL_ROLES,
  Role,
  SESSION_COOKIE,
  createSessionCookieValue,
  isPinConfigured,
  verifyPin,
} from "@/lib/auth";

export type UnlockState = { error?: string };

function isSafeRedirect(to: string | null | undefined): to is string {
  if (!to) return false;
  // Only allow same-origin paths.
  return to.startsWith("/") && !to.startsWith("//");
}

export async function unlock(
  _prev: UnlockState,
  formData: FormData
): Promise<UnlockState> {
  const roleRaw = String(formData.get("role") || "");
  const pin = String(formData.get("pin") || "");
  const from = String(formData.get("from") || "");

  if (!ALL_ROLES.includes(roleRaw as Role)) {
    return { error: "Pick a role." };
  }
  const role = roleRaw as Role;

  if (!isPinConfigured(role)) {
    return { error: "This role is not available. Try another." };
  }
  if (!verifyPin(role, pin)) {
    return { error: "Wrong PIN." };
  }

  const { value } = await createSessionCookieValue(role);
  // Session cookie (no maxAge) — closing the browser requires PIN again.
  cookies().set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  redirect(isSafeRedirect(from) ? from : "/");
}

export async function lock() {
  cookies().delete(SESSION_COOKIE);
  redirect("/unlock");
}
