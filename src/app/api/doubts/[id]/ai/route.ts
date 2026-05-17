// POST /api/doubts/:id/ai — Gemini first-pass answer (JSON API avoids opaque
// Server Components errors when long-running AI work runs from the client).

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { answerDoubtWithAi } from "@/lib/ai/doubt";
import { can, currentRole } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const role = await currentRole();
  if (!role) {
    return NextResponse.json(
      { ok: false, error: "Not signed in." },
      { status: 401 },
    );
  }
  if (!can(role, "ai:answer_doubt")) {
    return NextResponse.json(
      { ok: false, error: "You cannot request AI answers." },
      { status: 403 },
    );
  }

  try {
    const result = await answerDoubtWithAi(params.id);
    revalidatePath("/doubts");
    revalidatePath("/");
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Could not get an AI answer. Try again in a minute.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
