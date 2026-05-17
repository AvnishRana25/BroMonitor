"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  HelpCircle,
  LayoutDashboard,
  Siren,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Role } from "@/lib/auth";

type Tab = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
};

// Up to 5 tabs comfortably fit on a phone. The set differs by role:
//   - Brother (student): Home / Log / Doubts / Subjects / Tests
//   - Father (guardian): Home / Daily / Doubts / Tests / Alerts
//   - Admin: same as guardian, but "Doubts" is also there.
// The Log/Doubts entry points are the two things either person does most.
function tabsForRole(role: Role): Tab[] {
  if (role === "student") {
    return [
      { href: "/", label: "Home", icon: LayoutDashboard },
      { href: "/daily/new", label: "Log", icon: CalendarDays },
      { href: "/doubts", label: "Doubts", icon: HelpCircle },
      { href: "/subjects", label: "Syllabus", icon: BookOpenCheck },
      { href: "/tests", label: "Tests", icon: ClipboardList },
    ];
  }
  return [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/daily", label: "Logs", icon: CalendarDays },
    { href: "/doubts", label: "Doubts", icon: HelpCircle },
    { href: "/tests", label: "Tests", icon: ClipboardList },
    { href: "/alerts", label: "Alerts", icon: Siren },
  ];
}

export function MobileBottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = tabsForRole(role);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-bg-soft/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {items.map((t) => {
          const active =
            t.href === "/"
              ? pathname === "/"
              : pathname === t.href || pathname.startsWith(t.href + "/");
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 min-h-[52px] text-[10px] font-medium transition",
                active ? "text-accent" : "text-ink-faint",
              )}
            >
              <Icon className={cn("w-5 h-5", active && "text-accent")} />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
