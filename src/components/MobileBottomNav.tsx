"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Role } from "@/lib/auth";

const tabs: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
}[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/daily/new", label: "Log", icon: CalendarDays, roles: ["student", "admin"] },
  { href: "/subjects", label: "Syllabus", icon: BookOpenCheck },
  { href: "/tests", label: "Tests", icon: ClipboardList },
];

export function MobileBottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = tabs.filter((t) => !t.roles || t.roles.includes(role));

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
                active ? "text-accent" : "text-ink-faint"
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
