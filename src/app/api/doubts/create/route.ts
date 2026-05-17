import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createDoubtFromFormData } from "@/lib/doubtCreate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const result = await createDoubtFromFormData(formData);
    if (result.ok) {
      revalidatePath("/doubts");
      revalidatePath("/");
    }
    return NextResponse.json(result, {
      status: result.ok ? 200 : (result.status ?? 400),
    });
  } catch (e) {
    console.error("POST /api/doubts/create:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Could not add doubt.",
      },
      { status: 500 },
    );
  }
}
