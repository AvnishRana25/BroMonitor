"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { AlertCard, type AlertCardProps } from "@/components/AlertCard";
import { EmptyState } from "@/components/EmptyState";
import { alertMeta, sortAlertsBySeverity } from "@/lib/alertMeta";
import { ackAllAtOrBelow } from "@/app/alerts/actions";
import { cn } from "@/lib/utils";

export type AlertRow = AlertCardProps & { payloadJson: string | null };

type Filter = "all" | "red" | "warn" | "info";

export function AlertsView({
  active,
  acknowledged,
  snoozed,
  resolved,
  canAck = false,
  canSnooze = false,
  canDelete = false,
}: {
  active: AlertRow[];
  acknowledged: AlertRow[];
  snoozed: AlertRow[];
  resolved: AlertRow[];
  canAck?: boolean;
  canSnooze?: boolean;
  canDelete?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [pending, start] = useTransition();
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [showSnoozed, setShowSnoozed] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const matchesQuery = (a: AlertRow) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.body.toLowerCase().includes(q) ||
      alertMeta(a.kind).label.toLowerCase().includes(q) ||
      alertMeta(a.kind).category.toLowerCase().includes(q)
    );
  };

  const sortedActive = useMemo(() => sortAlertsBySeverity(active), [active]);
  const filteredActive = useMemo(() => {
    return sortedActive
      .filter((a) => (filter === "all" ? true : a.severity === filter))
      .filter(matchesQuery);
    // matchesQuery captures `query` via closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedActive, filter, query]);

  const counts = useMemo(
    () => ({
      red: active.filter((a) => a.severity === "red").length,
      warn: active.filter((a) => a.severity === "warn").length,
      info: active.filter((a) => a.severity === "info").length,
    }),
    [active],
  );

  // Group active alerts by category — easier scan for father.
  const grouped = useMemo(() => {
    const map = new Map<string, AlertRow[]>();
    for (const a of filteredActive) {
      const cat = alertMeta(a.kind).category;
      const arr = map.get(cat) ?? [];
      arr.push(a);
      map.set(cat, arr);
    }
    return [...map.entries()].sort((a, b) => {
      // Highest-severity-in-group first, then alphabetical.
      const sevRank = (rows: AlertRow[]) =>
        Math.min(
          ...rows.map((r) =>
            r.severity === "red" ? 0 : r.severity === "warn" ? 1 : 2,
          ),
        );
      const sa = sevRank(a[1]);
      const sb = sevRank(b[1]);
      if (sa !== sb) return sa - sb;
      return a[0].localeCompare(b[0]);
    });
  }, [filteredActive]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryPill label="Red" value={counts.red} tone="bad" />
        <SummaryPill label="Warn" value={counts.warn} tone="warn" />
        <SummaryPill label="Info" value={counts.info} tone="accent" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-ink-faint absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search alerts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input w-full pl-8 text-sm py-1.5"
          />
        </div>
        {(["all", "red", "warn", "info"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "chip text-xs capitalize transition",
              filter === f && "bg-accent/20 border-accent/50 text-accent",
            )}
          >
            {f === "all" ? `All (${active.length})` : `${f} (${counts[f]})`}
          </button>
        ))}
        {canAck && (counts.info > 0 || counts.warn > 0) && (
          <div className="flex items-center gap-1 ml-auto">
            {counts.info > 0 && (
              <button
                type="button"
                onClick={() =>
                  start(() => {
                    void ackAllAtOrBelow("info");
                  })
                }
                disabled={pending}
                className="btn-ghost text-xs"
              >
                Ack all info ({counts.info})
              </button>
            )}
            {(counts.info > 0 || counts.warn > 0) && (
              <button
                type="button"
                onClick={() => {
                  if (
                    !confirm(
                      `Acknowledge all ${counts.info + counts.warn} info + warn alerts? Red alerts stay.`,
                    )
                  )
                    return;
                  start(() => {
                    void ackAllAtOrBelow("warn");
                  });
                }}
                disabled={pending}
                className="btn-ghost text-xs"
              >
                Ack all info+warn ({counts.info + counts.warn})
              </button>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          <div className="text-sm font-semibold">Active</div>
          <span className="text-xs text-ink-faint">({filteredActive.length})</span>
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-xs text-accent hover:underline"
            >
              clear search
            </button>
          )}
        </div>
        {filteredActive.length === 0 ? (
          <EmptyState
            title={
              active.length === 0
                ? "Nothing flagged right now"
                : query
                ? "No alerts match this search"
                : "No alerts in this filter"
            }
            description={
              active.length === 0
                ? "No subject neglect, no test slide, no doubt backlog, no log gaps."
                : query
                ? "Try a different keyword or clear the search."
                : "Try another severity filter."
            }
          />
        ) : (
          <div className="space-y-4">
            {grouped.map(([category, rows]) => (
              <CategoryGroup
                key={category}
                title={category}
                count={rows.length}
              >
                <div className="space-y-2">
                  {rows.map((a) => (
                    <AlertCard
                      key={a.id}
                      {...a}
                      canAck={canAck}
                      canSnooze={canSnooze}
                      canDelete={canDelete}
                    />
                  ))}
                </div>
              </CategoryGroup>
            ))}
          </div>
        )}
      </div>

      {snoozed.length > 0 && (
        <CollapsibleSection
          title="Snoozed"
          count={snoozed.length}
          hint="Hidden until the snooze ends."
          open={showSnoozed}
          onToggle={() => setShowSnoozed((s) => !s)}
        >
          <div className="space-y-2">
            {sortAlertsBySeverity(snoozed).map((a) => (
              <AlertCard
                key={a.id}
                {...a}
                canAck={canAck}
                canSnooze={canSnooze}
                canDelete={canDelete}
              />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {acknowledged.length > 0 && (
        <CollapsibleSection
          title="Acknowledged"
          count={acknowledged.length}
          hint="You've seen these — condition may still apply."
          open={showAcknowledged}
          onToggle={() => setShowAcknowledged((s) => !s)}
        >
          <div className="space-y-2">
            {sortAlertsBySeverity(acknowledged).map((a) => (
              <AlertCard
                key={a.id}
                {...a}
                canAck={canAck}
                canSnooze={canSnooze}
                canDelete={canDelete}
              />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {resolved.length > 0 && (
        <CollapsibleSection
          title="Recently resolved"
          count={resolved.length}
          hint="Stopped triggering on their own."
          open={showResolved}
          onToggle={() => setShowResolved((s) => !s)}
        >
          <div className="space-y-2">
            {resolved.map((a) => (
              <AlertCard
                key={a.id}
                {...a}
                canAck={false}
                canSnooze={false}
                canDelete={canDelete}
              />
            ))}
          </div>
        </CollapsibleSection>
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

function CategoryGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-border-soft rounded-xl bg-bg-soft/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-hover/50 rounded-t-xl"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-ink-faint" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-ink-faint" />
        )}
        <div className="text-xs font-semibold uppercase tracking-wide text-ink-dim">
          {title}
        </div>
        <span className="text-[10px] text-ink-faint">({count})</span>
      </button>
      {open && <div className="p-3 pt-0">{children}</div>}
    </div>
  );
}

function CollapsibleSection({
  title,
  count,
  hint,
  open,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  hint?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 flex-wrap text-left mb-2"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-ink-faint" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-ink-faint" />
        )}
        <div className="text-sm font-semibold">{title}</div>
        <span className="text-xs text-ink-faint">({count})</span>
        {hint && <span className="text-xs text-ink-faint">· {hint}</span>}
      </button>
      {open && children}
    </div>
  );
}
