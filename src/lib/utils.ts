import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtDate(d: Date | string, withYear = false) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export function fmtDateTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Monday-of-week, local midnight. JEE prep aligns with school weeks (Mon-Sun),
// and Indian timezone makes a US-style Sunday-start awkward. Pick Mon and move on.
export function weekStart(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function fmtRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return fmtDate(date);
}

// Local YYYY-MM-DD string for <input type="date"> defaults and URL params.
// Avoids the Date.toISOString() pitfall that uses UTC and returns yesterday
// late at night in non-UTC timezones (e.g. IST).
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parse a YYYY-MM-DD string as a *local* midnight Date. Avoids the
// `new Date("YYYY-MM-DD")` quirk where the string is parsed as UTC.
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function todayLocalInputValue(): string {
  return toDateInputValue(new Date());
}

export function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

// Each status carries a fixed percentage contribution towards completion.
// Used identically by the Subjects page and the Dashboard.
export const TOPIC_STATUSES = [
  { value: "not_started", label: "Not started", color: "#3b3f4d", pct: 0 },
  { value: "class_taught", label: "Class taught", color: "#7c8cff", pct: 20 },
  { value: "self_studied", label: "Self studied", color: "#5aa9ff", pct: 40 },
  { value: "problems_done", label: "Problems done", color: "#ffb86b", pct: 60 },
  { value: "revised", label: "Revised", color: "#a78bfa", pct: 80 },
  { value: "mastered", label: "Mastered", color: "#52d195", pct: 100 },
] as const;

export function topicPct(status: string): number {
  return TOPIC_STATUSES.find((s) => s.value === status)?.pct ?? 0;
}

export function avgProgressPct(topics: { status: string }[]): number {
  if (topics.length === 0) return 0;
  const sum = topics.reduce((s, t) => s + topicPct(t.status), 0);
  return Math.round(sum / topics.length);
}

export const TEST_TYPES = [
  { value: "school_unit", label: "School — Unit Test", source: "school" },
  { value: "school_half_yearly", label: "School — Half Yearly", source: "school" },
  { value: "school_final", label: "School — Annual / Final", source: "school" },
  { value: "coaching_weekly", label: "Coaching — Weekly Test", source: "coaching" },
  { value: "coaching_part", label: "Coaching — Part Test", source: "coaching" },
  { value: "coaching_full", label: "Coaching — Full Test", source: "coaching" },
] as const;
