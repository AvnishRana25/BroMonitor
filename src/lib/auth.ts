// Tiny role-based PIN auth, sized for a family-of-three personal app.
// No User table, no NextAuth — three PINs from .env, signed cookie.
//
// Cookie value layout:   `<role>.<expSeconds>.<base64url(hmac256)>`
// The HMAC binds (role, exp) to APP_SECRET so the cookie can't be forged.
//
// Uses Web Crypto (globalThis.crypto.subtle) so the same code runs in the
// edge-runtime middleware and in node-runtime server actions/pages.

export type Role = "student" | "guardian" | "admin";

export const ALL_ROLES: Role[] = ["student", "guardian", "admin"];

export const ROLE_META: Record<
  Role,
  { label: string; subtitle: string; tone: string }
> = {
  student: {
    label: "Brother",
    subtitle: "Log study, add evidence, write reflection",
    tone: "text-physics",
  },
  guardian: {
    label: "Father",
    subtitle: "View progress, read reports",
    tone: "text-good",
  },
  admin: {
    label: "Admin (you)",
    subtitle: "Everything — edit, delete, configure",
    tone: "text-accent",
  },
};

export const SESSION_COOKIE = "bm_role";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function appSecret(): string {
  const s = process.env.APP_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "APP_SECRET must be set (>=16 chars) in production. Add it to .env"
    );
  }
  return "dev-only-fallback-secret-change-me";
}

function pinFor(role: Role): string | null {
  const raw =
    role === "student"
      ? process.env.PIN_STUDENT
      : role === "guardian"
      ? process.env.PIN_GUARDIAN
      : process.env.PIN_ADMIN;
  return raw && raw.trim() ? raw.trim() : null;
}

export function isPinConfigured(role: Role): boolean {
  return pinFor(role) !== null;
}

export function anyPinConfigured(): boolean {
  return ALL_ROLES.some(isPinConfigured);
}

function bufToB64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function sign(role: Role, exp: number): Promise<string> {
  const key = await importHmacKey(appSecret());
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${role}.${exp}`)
  );
  return bufToB64Url(sig);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionCookieValue(role: Role): Promise<{
  value: string;
  maxAge: number;
}> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const sig = await sign(role, exp);
  return { value: `${role}.${exp}.${sig}`, maxAge: SESSION_MAX_AGE_SECONDS };
}

export async function parseSessionCookie(
  raw: string | undefined | null
): Promise<Role | null> {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [roleStr, expStr, sig] = parts;
  if (!ALL_ROLES.includes(roleStr as Role)) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;

  const expected = await sign(roleStr as Role, exp);
  if (!constantTimeEqual(sig, expected)) return null;
  return roleStr as Role;
}

// PIN check. PINs are short and low-entropy by design; this isn't fort-knox,
// it's a "keep the admin panel out of view" check. Still constant-time.
export function verifyPin(role: Role, candidate: string): boolean {
  const expected = pinFor(role);
  if (!expected) return false;
  // Pad both to the same length so the comparison is constant time wrt input.
  const len = Math.max(expected.length, candidate.length, 16);
  const a = candidate.padEnd(len, "\0");
  const b = expected.padEnd(len, "\0");
  return constantTimeEqual(a, b);
}
