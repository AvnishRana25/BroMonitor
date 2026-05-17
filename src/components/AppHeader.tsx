"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_META, Role } from "@/lib/auth";
import { pageMetaForPath } from "@/lib/navigation";
import { lock } from "@/app/unlock/actions";

function RoleAvatar({ role }: { role: Role }) {
  const meta = ROLE_META[role];
  return (
    <div
      className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
        role === "student" && "bg-physics/20 text-physics",
        role === "guardian" && "bg-good/20 text-good",
        role === "admin" && "bg-accent/20 text-accent",
      )}
      title={meta.label}
      aria-label={meta.label}
    >
      {meta.initial}
    </div>
  );
}

export function AppHeader({ role }: { role: Role }) {
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const meta = ROLE_META[role];
  const isHome = pathname === "/";
  const pageMeta = pageMetaForPath(pathname);

  return (
    <header className="border-b border-border bg-bg-soft/80 backdrop-blur sticky top-0 z-20">
      <div className="px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex items-center gap-3 max-w-[1400px] w-full mx-auto">
        {isHome ? (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <RoleAvatar role={role} />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight">
                BroMonitor
              </h1>
              <p className="text-[11px] sm:text-xs text-ink-faint truncate">
                Signed in as{" "}
                <span className={cn("font-medium", meta.tone)}>
                  {meta.label}
                </span>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link
              href="/"
              className="flex items-center gap-1 text-sm text-ink-dim hover:text-accent transition shrink-0 min-h-[44px] pr-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <div className="min-w-0 border-l border-border-soft pl-3">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">
                {pageMeta.title}
              </h1>
              {pageMeta.sub && (
                <p className="text-[11px] sm:text-xs text-ink-faint mt-0.5 truncate max-md:hidden">
                  {pageMeta.sub}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {!isHome && (
            <div className="text-right hidden sm:block">
              <div
                className={cn("text-sm font-medium leading-tight", meta.tone)}
              >
                {meta.label}
              </div>
            </div>
          )}
          {!isHome && <RoleAvatar role={role} />}
          <button
            type="button"
            disabled={pending}
            onClick={() => start(() => void lock())}
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
