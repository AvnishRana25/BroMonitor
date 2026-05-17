import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { uploadOneEvidencePhoto } from "@/lib/evidenceUpload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function revalidatePhotoPaths() {
  revalidatePath("/daily");
  revalidatePath("/");
  revalidatePath("/daily/new");
}

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
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "No photo in request." },
        { status: 400 },
      );
    }
    const result = await uploadOneEvidencePhoto(dailyLogId, file);
    if (result.ok) {
      revalidatePhotoPaths();
    }
    return NextResponse.json(result, {
      status: result.ok ? 200 : (result.status ?? 400),
    });
  } catch (e) {
    console.error("POST /api/photos/upload:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Upload failed. Try again.",
      },
      { status: 500 },
    );
  }
}
