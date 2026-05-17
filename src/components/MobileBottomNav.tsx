"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  HelpCircle,
  LayoutDashboard,
  Sparkles,
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

// Up to 5 tabs fit on a phone. Sets mirror the desktop sidebar per role.
function tabsForRole(role: Role): Tab[] {
  if (role === "student") {
    return [
      { href: "/", label: "Home", icon: LayoutDashboard },
      {
        href: "/daily/new",
        label: "Log",
        icon: CalendarDays,
      },
      { href: "/doubts", label: "Doubts", icon: HelpCircle },
      { href: "/subjects", label: "Syllabus", icon: BookOpenCheck },
      { href: "/tests", label: "Tests", icon: ClipboardList },
    ];
  }
  if (role === "guardian" || role === "admin") {
    return [
      { href: "/", label: "Home", icon: LayoutDashboard },
      { href: "/tests", label: "Tests", icon: ClipboardList },
      { href: "/daily", label: "Logs", icon: CalendarDays },
      { href: "/reports", label: "Reports", icon: Sparkles },
      { href: "/alerts", label: "Alerts", icon: Siren },
    ];
  }
  return [];
}

export function MobileBottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = tabsForRole(role);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-bg-soft/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto px-1">
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
