"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpenCheck,
  ClipboardList,
  HelpCircle,
  GraduationCap,
  Siren,
  Sparkles,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_META, Role } from "@/lib/auth";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
};

const nav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/daily", label: "Daily log", icon: CalendarDays },
  { href: "/subjects", label: "Subjects", icon: BookOpenCheck },
  { href: "/tests", label: "Tests", icon: ClipboardList },
  { href: "/doubts", label: "Doubts", icon: HelpCircle },
  { href: "/alerts", label: "Alerts", icon: Siren, roles: ["guardian", "admin"] },
  { href: "/plan", label: "Weekly plan", icon: Target, roles: ["guardian", "admin"] },
  { href: "/reports", label: "AI reports", icon: Sparkles, roles: ["guardian", "admin"] },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const meta = ROLE_META[role];
  const items = nav.filter((n) => !n.roles || n.roles.includes(role));
  return (
    <aside className="w-60 shrink-0 border-r border-border bg-bg-soft hidden md:flex flex-col">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-accent" />
        </div>
        <div>
          <div className="font-semibold leading-none">BroMonitor</div>
          <div className="text-[11px] text-ink-faint mt-1">Class 11 daily tracker</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((n) => {
          const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition",
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
        Signed in as{" "}
        <span className={cn("font-medium", meta.tone)}>{meta.label}</span>
      </div>
    </aside>
  );
}
