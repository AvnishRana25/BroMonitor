"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const titles: Record<string, { title: string; sub: string }> = {
  "/": { title: "Dashboard", sub: "Today at a glance" },
  "/daily": { title: "Daily log", sub: "What he studied each day" },
  "/daily/new": { title: "Add log", sub: "Log today's study" },
  "/subjects": { title: "Subjects", sub: "Chapter-wise progress" },
  "/tests": { title: "Tests", sub: "Past results and upcoming tests" },
  "/tests/new": { title: "Log a test", sub: "Record marks and breakdown" },
  "/tests/upcoming/new": {
    title: "Schedule a test",
    sub: "Plan revision around upcoming exams",
  },
  "/doubts": { title: "Doubts", sub: "Open questions to resolve" },
};

const mobileNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/daily", label: "Daily log", icon: CalendarDays },
  { href: "/subjects", label: "Subjects", icon: BookOpenCheck },
  { href: "/tests", label: "Tests", icon: ClipboardList },
  { href: "/doubts", label: "Doubts", icon: HelpCircle },
];

export function TopBar({ studentName }: { studentName: string }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const key = Object.keys(titles)
    .filter((k) => k === pathname || (k !== "/" && pathname.startsWith(k)))
    .sort((a, b) => b.length - a.length)[0];
  const meta = titles[key] ?? titles["/"];

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <header className="border-b border-border bg-bg-soft/60 backdrop-blur sticky top-0 z-20">
      <div className="px-4 sm:px-6 lg:px-10 py-4 flex items-center gap-3 max-w-[1400px] w-full mx-auto">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          className="md:hidden p-2 -ml-2 rounded-lg text-ink-dim hover:text-ink hover:bg-bg-hover transition"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-semibold tracking-tight truncate">
            {meta.title}
          </div>
          <div className="text-xs text-ink-faint mt-0.5 truncate">
            {meta.sub}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-ink-faint">Tracking</div>
            <div className="text-sm font-medium">{studentName}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-semibold shrink-0">
            {studentName?.[0]?.toUpperCase() ?? "B"}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-30">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85%] bg-bg-soft border-r border-border shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-5 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <div className="font-semibold leading-none">BroMonitor</div>
                  <div className="text-[11px] text-ink-faint mt-1">
                    Class 11 daily tracker
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="p-2 -mr-2 rounded-lg text-ink-dim hover:text-ink hover:bg-bg-hover transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {mobileNav.map((n) => {
                const active =
                  pathname === n.href ||
                  (n.href !== "/" && pathname.startsWith(n.href));
                const Icon = n.icon;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition",
                      active
                        ? "bg-accent/15 text-accent"
                        : "text-ink-dim hover:text-ink hover:bg-bg-hover"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {n.label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-5 py-4 border-t border-border text-[11px] text-ink-faint">
              Tracking {studentName}
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
