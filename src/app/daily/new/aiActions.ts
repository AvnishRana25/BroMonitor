"use server";

import { requireRole } from "@/lib/session";
import { parseDailyLogFromText, type ParsedLog } from "@/lib/ai/parseLog";

export type ParseLogResult =
  | { ok: true; data: ParsedLog }
  | { ok: false; error: string };

export async function parseLogTextAction(text: string): Promise<ParseLogResult> {
  await requireRole(["student", "admin"]);
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Type a one-line summary first." };
  try {
    const data = await parseDailyLogFromText({ text: trimmed });
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not parse with AI.",
    };
  }
}
