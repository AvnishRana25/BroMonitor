// POST /api/photos/upload — multipart evidence upload (bypasses the 1 MB
// default Server Action body limit, which breaks camera/gallery on mobile).

import { NextResponse } from "next/server";
import { uploadDailyPhoto } from "@/app/photos/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const dailyLogId = String(formData.get("dailyLogId") ?? "").trim();
    if (!dailyLogId) {
      return NextResponse.json(
        { ok: false, error: "Missing daily log id." },
        { status: 400 },
      );
    }
    const file = formData.get("photo");
    if (!(file instanceof File) || !file.size) {
      return NextResponse.json(
        { ok: false, error: "No photo in request." },
        { status: 400 },
      );
    }
    const fd = new FormData();
    fd.set("photo", file);
    const result = await uploadDailyPhoto(dailyLogId, fd);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Upload failed. Try again.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
