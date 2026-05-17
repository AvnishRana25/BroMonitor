// Server-side session helpers used by pages, layouts, and server actions.
// Kept separate from src/lib/auth.ts so the middleware (edge runtime) doesn't
// pull in next/headers (which doesn't exist on the edge).

import "server-only";
import { cookies } from "next/headers";
import { ALL_ROLES, Role, SESSION_COOKIE, parseSessionCookie } from "./auth";

export async function currentRole(): Promise<Role | null> {
  const c = cookies().get(SESSION_COOKIE)?.value;
  return parseSessionCookie(c);
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// Throws in server actions if the caller's role isn't allowed.
// Default is "admin only" so anything sensitive must opt down.
export async function requireRole(allowed: Role[] = ["admin"]): Promise<Role> {
  const role = await currentRole();
  if (!role) throw new ForbiddenError("Not signed in");
  if (!allowed.includes(role)) {
    throw new ForbiddenError(`Role '${role}' cannot perform this action`);
  }
  return role;
}

export function can(role: Role | null, action: Action): boolean {
  if (!role) return false;
  return ABILITIES[action].includes(role);
}

export type Action =
  | "log:create"
  | "log:edit"
  | "log:delete"
  | "test:create"
  | "test:delete"
  | "test:delete_scheduled"
  | "doubt:create"
  | "doubt:resolve"
  | "doubt:delete"
  | "topic:update"
  | "syllabus:edit"
  | "reflection:write"
  | "evidence:upload"
  | "evidence:delete"
  | "config:admin"
  | "plan:edit"
  | "alert:view"
  | "alert:ack"
  | "alert:snooze"
  | "alert:delete"
  | "comment:create"
  | "comment:delete"
  | "report:view"
  | "report:generate"
  | "report:email"
  | "report:delete"
  | "ai:parse_log"
  | "ai:answer_doubt";

const ABILITIES: Record<Action, Role[]> = {
  "log:create": ["student", "admin"],
  "log:edit": ["student", "admin"],
  "log:delete": ["admin"],
  "test:create": ["student", "guardian", "admin"],
  "test:delete": ["admin"],
  "test:delete_scheduled": ["guardian", "admin"],
  "doubt:create": ["student", "admin"],
  "doubt:resolve": ["student", "admin"],
  "doubt:delete": ["student", "admin"],
  "topic:update": ["student", "admin"],
  "syllabus:edit": ["admin"],
  "reflection:write": ["student", "admin"],
  "evidence:upload": ["student", "admin"],
  "evidence:delete": ["student", "admin"],
  "config:admin": ["admin"],
  // Father owns the weekly plan; admin can edit too.
  "plan:edit": ["guardian", "admin"],
  // Alerts and comments are father's tools. Brother sees the underlying data
  // (his own dashboard) but doesn't see the alert panel framed for father.
  "alert:view": ["guardian", "admin"],
  "alert:ack": ["guardian", "admin"],
  "alert:snooze": ["guardian", "admin"],
  "alert:delete": ["admin"],
  "comment:create": ["guardian", "admin"],
  "comment:delete": ["admin"],
  "report:view": ["guardian", "admin"],
  "report:generate": ["guardian", "admin"],
  "report:email": ["guardian", "admin"],
  "report:delete": ["admin"],
  "ai:parse_log": ["student", "admin"],
  "ai:answer_doubt": ["student", "guardian", "admin"],
};

export { ALL_ROLES };
export type { Role };
