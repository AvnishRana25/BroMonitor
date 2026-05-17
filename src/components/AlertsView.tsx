"use client";

import { useMemo, useState } from "react";
import { AlertCard, type AlertCardProps } from "@/components/AlertCard";
import { EmptyState } from "@/components/EmptyState";
import { alertMeta, sortAlertsBySeverity } from "@/lib/alertMeta";
import { cn } from "@/lib/utils";

export type AlertRow = AlertCardProps & { payloadJson: string | null };

type Filter = "all" | "red" | "warn" | "info";

export function AlertsView({
  active,
  acknowledged,
  resolved,
  canDelete = false,
}: {
  active: AlertRow[];
  acknowledged: AlertRow[];
  resolved: AlertRow[];
  canDelete?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const sortedActive = useMemo(() => sortAlertsBySeverity(active), [active]);
  const filteredActive = useMemo(() => {
    if (filter === "all") return sortedActive;
    return sortedActive.filter((a) => a.severity === filter);
  }, [sortedActive, filter]);

  const counts = useMemo(
    () => ({
      red: active.filter((a) => a.severity === "red").length,
      warn: active.filter((a) => a.severity === "warn").length,
      info: active.filter((a) => a.severity === "info").length,
    }),
    [active]
  );

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of active) {
      const cat = alertMeta(a.kind).category;
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [active]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryPill label="Red" value={counts.red} tone="bad" />
        <SummaryPill label="Warn" value={counts.warn} tone="warn" />
        <SummaryPill label="Info" value={counts.info} tone="accent" />
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map(([cat, n]) => (
            <span key={cat} className="chip text-[11px]">
              {cat} · {n}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(["all", "red", "warn", "info"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "chip text-xs capitalize transition",
              filter === f && "bg-accent/20 border-accent/50 text-accent"
            )}
          >
            {f === "all" ? `All (${active.length})` : `${f} (${counts[f]})`}
          </button>
        ))}
      </div>

      <Section title="Active" count={filteredActive.length} hint="Needs attention.">
        {filteredActive.length === 0 ? (
          <EmptyState
            title={active.length === 0 ? "Nothing flagged right now" : "No alerts in this filter"}
            description={
              active.length === 0
                ? "No subject neglect, no test slide, no doubt backlog, no log gaps."
                : "Try another severity filter."
            }
          />
        ) : (
          <div className="space-y-2">
            {filteredActive.map((a) => (
              <AlertCard key={a.id} {...a} canDelete={canDelete} />
            ))}
          </div>
        )}
      </Section>

      {acknowledged.length > 0 && (
        <Section
          title="Acknowledged"
          count={acknowledged.length}
          hint="You've seen these — condition may still apply."
        >
          <div className="space-y-2">
            {sortAlertsBySeverity(acknowledged).map((a) => (
              <AlertCard key={a.id} {...a} canDelete={canDelete} />
            ))}
          </div>
        </Section>
      )}

      {resolved.length > 0 && (
        <Section
          title="Recently resolved"
          count={resolved.length}
          hint="Stopped triggering on their own."
        >
          <div className="space-y-2">
            {resolved.map((a) => (
              <AlertCard key={a.id} {...a} canAck={false} canDelete={canDelete} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "bad" | "warn" | "accent";
}) {
  const cls =
    tone === "bad"
      ? "border-bad/40 bg-bad/10 text-bad"
      : tone === "warn"
      ? "border-warn/40 bg-warn/10 text-warn"
      : "border-accent/40 bg-accent/10 text-accent";
  return (
    <div className={cn("rounded-xl border p-3 text-center", cls)}>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide mt-0.5 opacity-80">
        {label}
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  hint,
  children,
}: {
  title: string;
  count: number;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 flex-wrap">
        <div className="text-sm font-semibold">{title}</div>
        <span className="text-xs text-ink-faint">({count})</span>
        {hint && <span className="text-xs text-ink-faint">· {hint}</span>}
      </div>
      {children}
    </div>
  );
}
