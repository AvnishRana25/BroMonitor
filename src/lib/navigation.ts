import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  HelpCircle,
  LayoutDashboard,
  PenLine,
  Siren,
  Sparkles,
  Target,
} from "lucide-react";
import type { Role } from "@/lib/auth";

export type HubItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  roles: Role[];
  /** Larger tile on the hub grid */
  featured?: boolean;
  accent: "accent" | "good" | "warn" | "physics" | "chemistry" | "maths";
};

const HUB_ITEMS: HubItem[] = [
  {
    href: "/overview",
    label: "Overview",
    description: "Charts, alerts, and how the week is going",
    icon: LayoutDashboard,
    roles: ["student", "guardian", "admin"],
    featured: true,
    accent: "accent",
  },
  {
    href: "/daily/new",
    label: "Today's log",
    description: "Log study, photos, and reflection (~2 min)",
    icon: PenLine,
    roles: ["student", "admin"],
    featured: true,
    accent: "good",
  },
  {
    href: "/daily",
    label: "Daily logs",
    description: "Browse and edit past days",
    icon: CalendarDays,
    roles: ["student", "guardian", "admin"],
    accent: "physics",
  },
  {
    href: "/subjects",
    label: "Syllabus",
    description: "Chapters, topics, and mastery",
    icon: BookOpenCheck,
    roles: ["student", "guardian", "admin"],
    accent: "chemistry",
  },
  {
    href: "/tests",
    label: "Tests",
    description: "Schedule exams, log scores, AI briefs",
    icon: ClipboardList,
    roles: ["student", "guardian", "admin"],
    accent: "maths",
  },
  {
    href: "/doubts",
    label: "Doubts",
    description: "Open questions and AI explanations",
    icon: HelpCircle,
    roles: ["student", "guardian", "admin"],
    accent: "warn",
  },
  {
    href: "/alerts",
    label: "Alerts",
    description: "Rule-based flags that need attention",
    icon: Siren,
    roles: ["guardian", "admin"],
    accent: "warn",
  },
  {
    href: "/plan",
    label: "Weekly plan",
    description: "Set hour targets and track pace",
    icon: Target,
    roles: ["guardian", "admin"],
    accent: "good",
  },
  {
    href: "/reports",
    label: "AI reports",
    description: "Weekly, monthly, and test briefs",
    icon: Sparkles,
    roles: ["guardian", "admin"],
    accent: "accent",
  },
];

export function hubItemsForRole(role: Role): HubItem[] {
  const items = HUB_ITEMS.filter((i) => i.roles.includes(role));
  // One featured tile per role: student → today's log; guardian/admin → overview
  if (role === "student") {
    return items.map((i) => ({
      ...i,
      featured: i.href === "/daily/new",
    }));
  }
  return items.map((i) => ({
    ...i,
    featured: i.href === "/overview",
  }));
}

export const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  "/": { title: "Home", sub: "Choose what to open" },
  "/overview": { title: "Overview", sub: "This week at a glance" },
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

export function pageMetaForPath(pathname: string) {
  const key = Object.keys(PAGE_TITLES)
    .filter((k) => k === pathname || (k !== "/" && pathname.startsWith(k)))
    .sort((a, b) => b.length - a.length)[0];
  return PAGE_TITLES[key] ?? { title: "BroMonitor", sub: "" };
}
