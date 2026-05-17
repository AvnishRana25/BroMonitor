import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ensureDailyLogShell } from "@/lib/evidenceUpload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { date?: string };
    const date = String(body.date ?? "").trim();
    if (!date) {
      return NextResponse.json(
        { ok: false, error: "Missing date." },
        { status: 400 },
      );
    }
    const result = await ensureDailyLogShell(date);
    if (result.ok) {
      revalidatePath("/daily/new");
      revalidatePath("/daily");
    }
    return NextResponse.json(result, {
      status: result.ok ? 200 : result.status,
    });
  } catch (e) {
    console.error("POST /api/daily/ensure:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Could not prepare daily log.",
      },
      { status: 500 },
    );
  }
}
