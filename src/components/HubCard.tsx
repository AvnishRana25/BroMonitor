import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HubItem } from "@/lib/navigation";

const accentStyles: Record<
  HubItem["accent"],
  { border: string; bg: string; icon: string }
> = {
  accent: {
    border: "border-accent/35 hover:border-accent/60",
    bg: "bg-accent/10",
    icon: "text-accent",
  },
  good: {
    border: "border-good/35 hover:border-good/55",
    bg: "bg-good/10",
    icon: "text-good",
  },
  warn: {
    border: "border-warn/35 hover:border-warn/55",
    bg: "bg-warn/10",
    icon: "text-warn",
  },
  physics: {
    border: "border-physics/35 hover:border-physics/55",
    bg: "bg-physics/10",
    icon: "text-physics",
  },
  chemistry: {
    border: "border-chemistry/35 hover:border-chemistry/55",
    bg: "bg-chemistry/10",
    icon: "text-chemistry",
  },
  maths: {
    border: "border-maths/35 hover:border-maths/55",
    bg: "bg-maths/10",
    icon: "text-maths",
  },
};

export function HubCard({ item }: { item: HubItem }) {
  const Icon = item.icon;
  const styles = accentStyles[item.accent];

  return (
    <Link
      href={item.href}
      className={cn(
        "group card p-4 sm:p-5 border transition hover:bg-bg-hover/40 active:scale-[0.99]",
        styles.border,
        item.featured && "sm:col-span-2",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
            styles.bg,
          )}
        >
          <Icon className={cn("w-5 h-5", styles.icon)} />
        </div>
        <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-accent group-hover:translate-x-0.5 transition shrink-0 mt-1" />
      </div>
      <div className="mt-3">
        <div className="text-base font-semibold">{item.label}</div>
        <p className="text-sm text-ink-dim mt-1 leading-snug">
          {item.description}
        </p>
      </div>
    </Link>
  );
}
