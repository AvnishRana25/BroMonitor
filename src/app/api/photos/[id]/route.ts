import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentRole } from "@/lib/session";
import { readPhotoBytes } from "@/lib/photos";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const role = await currentRole();
  if (!role) return new NextResponse("unauthorized", { status: 401 });

  const photo = await prisma.photo.findUnique({ where: { id: params.id } });
  if (!photo) return new NextResponse("not found", { status: 404 });

  const bytes = await readPhotoBytes(photo.filename);
  if (!bytes) return new NextResponse("not found", { status: 404 });

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": photo.mime,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, max-age=86400, immutable",
    },
  });
}
