// GET /api/photos/:id — serves the daily-log evidence image bytes.
//
// We support two storage paths:
//   1) Cloudinary-hosted photos (publicId + url on the row) — we redirect
//      to the secure_url so the CDN serves the bytes directly.
//   2) Legacy local-filesystem photos (filename on the row) — we read from
//      ./uploads and stream the bytes (kept for dev / pre-Cloudinary rows).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentRole } from "@/lib/session";
import { readPhotoBytes } from "@/lib/photos";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const role = await currentRole();
  if (!role) return new NextResponse("unauthorized", { status: 401 });

  const photo = await prisma.photo.findUnique({
    where: { id: params.id },
    select: { url: true, filename: true, mime: true },
  });
  if (!photo) return new NextResponse("not found", { status: 404 });

  if (photo.url) {
    // 307 keeps the method; the browser fetches the image from Cloudinary.
    return NextResponse.redirect(photo.url, 307);
  }
  if (photo.filename) {
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
  return new NextResponse("not found", { status: 404 });
}
