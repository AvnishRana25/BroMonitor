import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { uploadOneEvidencePhoto } from "@/lib/evidenceUpload";
import { readFormUpload } from "@/lib/formUpload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function revalidatePhotoPaths() {
  revalidatePath("/daily");
  revalidatePath("/");
  revalidatePath("/daily/new");
}

type JsonBody = {
  dailyLogId?: string;
  base64?: string;
  mime?: string;
  name?: string;
};

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await req.json()) as JsonBody;
      const dailyLogId = String(body.dailyLogId ?? "").trim();
      const base64 = String(body.base64 ?? "").trim();
      if (!dailyLogId) {
        return NextResponse.json(
          { ok: false, error: "Missing daily log id." },
          { status: 400 },
        );
      }
      if (!base64) {
        return NextResponse.json(
          { ok: false, error: "No photo data in request." },
          { status: 400 },
        );
      }
      let bytes: Buffer;
      try {
        bytes = Buffer.from(base64, "base64");
      } catch {
        return NextResponse.json(
          { ok: false, error: "Invalid photo data." },
          { status: 400 },
        );
      }
      if (!bytes.byteLength) {
        return NextResponse.json(
          { ok: false, error: "Photo is empty." },
          { status: 400 },
        );
      }
      const mime =
        body.mime && body.mime.startsWith("image/")
          ? body.mime
          : "image/jpeg";
      const result = await uploadOneEvidencePhoto(dailyLogId, {
        bytes: new Uint8Array(bytes).buffer,
        mime,
        name: body.name || "photo.jpg",
        size: bytes.byteLength,
      });
      if (result.ok) revalidatePhotoPaths();
      return NextResponse.json(result, {
        status: result.ok ? 200 : (result.status ?? 400),
      });
    }

    const formData = await req.formData();
    const dailyLogId = String(formData.get("dailyLogId") ?? "").trim();
    if (!dailyLogId) {
      return NextResponse.json(
        { ok: false, error: "Missing daily log id." },
        { status: 400 },
      );
    }
    const upload = await readFormUpload(formData.get("photo"), "evidence.jpg");
    if (!upload) {
      return NextResponse.json(
        { ok: false, error: "No photo in request." },
        { status: 400 },
      );
    }
    const result = await uploadOneEvidencePhoto(dailyLogId, upload);
    if (result.ok) revalidatePhotoPaths();
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
