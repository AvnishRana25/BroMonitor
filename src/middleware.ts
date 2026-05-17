import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, parseSessionCookie } from "@/lib/auth";

// Anything not matched here requires a valid signed role cookie.
// /unlock is the only public page; everything else redirects there.
const PUBLIC_PATHS = ["/unlock"];

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/") && !pathname.startsWith("/api/cron/");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // Cron routes guard themselves with x-cron-secret. Bypass session cookie
  // check so they're callable from external schedulers.
  if (pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const role = await parseSessionCookie(cookie);

  if (!role && !isPublic) {
    // API clients expect JSON — never redirect uploads to the unlock HTML page.
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { ok: false, error: "Not signed in. Open /unlock and sign in again." },
        { status: 401 },
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/unlock";
    const dest = pathname + (req.nextUrl.search || "");
    if (dest && dest !== "/") url.searchParams.set("from", dest);
    return NextResponse.redirect(url);
  }

  if (role && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next internals and static assets so the middleware doesn't 308 fonts.
  matcher: [
    "/((?!_next/|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|gif)).*)",
  ],
};
