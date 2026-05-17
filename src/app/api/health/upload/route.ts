import { NextResponse } from "next/server";
import { isCloudinaryConfigured } from "@/lib/photos";
import { currentRole } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Quick check for mobile upload debugging (no secrets returned). */
export async function GET() {
  const role = await currentRole();
  return NextResponse.json({
    ok: true,
    signedIn: !!role,
    role,
    cloudinary: isCloudinaryConfigured(),
    database: !!process.env.DATABASE_URL,
  });
}
