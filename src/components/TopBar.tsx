"use client";

import { useTransition } from "react";
import { Lock } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ROLE_META, Role } from "@/lib/auth";
import { lock } from "@/app/unlock/actions";

const titles: Record<string, { title: string; sub: string }> = {
  "/": { title: "Dashboard", sub: "Today at a glance" },
  "/daily": { title: "Daily log", sub: "What he studied each day" },
  "/daily/new": { title: "Add log", sub: "Log study + snap evidence photos" },
  "/subjects": { title: "Subjects", sub: "Chapter-wise progress" },
  "/tests": { title: "Tests", sub: "Past results and upcoming tests" },
  "/tests/new": { title: "Log a test", sub: "Record marks and breakdown" },
  "/tests/upcoming/new": {
    title: "Schedule a test",
    sub: "Plan revision around upcoming exams",
  },
  "/doubts": { title: "Doubts", sub: "Open questions to resolve" },
  "/alerts": { title: "Alerts", sub: "Rule-engine output — facts, not vibes" },
  "/plan": { title: "Weekly plan", sub: "Targets to measure actual against" },
  "/reports": { title: "AI reports", sub: "Weekly, monthly and pre-test briefs" },
};

export function TopBar({
  studentName,
  role,
}: {
  studentName: string;
  role: Role;
}) {
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const meta = ROLE_META[role];

  const key = Object.keys(titles)
    .filter((k) => k === pathname || (k !== "/" && pathname.startsWith(k)))
    .sort((a, b) => b.length - a.length)[0];
  const pageMeta = titles[key] ?? titles["/"];

  return (
    <header className="border-b border-border bg-bg-soft/60 backdrop-blur sticky top-0 z-20">
      <div className="px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex items-center gap-3 max-w-[1400px] w-full mx-auto">
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">
            {pageMeta.title}
          </h1>
          <p className="text-[11px] sm:text-xs text-ink-faint mt-0.5 truncate max-md:hidden">
            {pageMeta.sub}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-ink-faint uppercase tracking-wide">
              Signed in as
            </div>
            <div className={cn("text-sm font-medium leading-tight", meta.tone)}>
              {meta.label}
            </div>
          </div>
          <div
            className="w-9 h-9 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-semibold"
            title={`Tracking ${studentName}`}
          >
            {studentName?.[0]?.toUpperCase() ?? "B"}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(() => {
                void lock();
              })
            }
            title="Lock"
            aria-label="Lock app"
            className="p-2.5 rounded-lg text-ink-dim hover:text-ink hover:bg-bg-hover transition disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
