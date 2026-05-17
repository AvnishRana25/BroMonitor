"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BellOff,
  Check,
  Clock,
  Info,
  RotateCcw,
  Siren,
  Trash2,
} from "lucide-react";
import { fmtRelative } from "@/lib/utils";
import {
  ackAlert,
  deleteAlert,
  snoozeAlert,
  unackAlert,
  type SnoozePreset,
} from "@/app/alerts/actions";
import { alertAction, alertMeta, parseAlertPayload } from "@/lib/alertMeta";

export type AlertCardProps = {
  id: string;
  kind: string;
  severity: "info" | "warn" | "red";
  title: string;
  body: string;
  suggestion: string | null;
  createdAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  snoozedUntil: string | null;
  snoozedBy: string | null;
  canAck: boolean;
  canSnooze?: boolean;
  canDelete?: boolean;
  payloadJson?: string | null;
};

const TONE: Record<
  AlertCardProps["severity"],
  { ring: string; bg: string; text: string; icon: React.ReactNode }
> = {
  red: {
    ring: "border-bad/40",
    bg: "bg-bad/5",
    text: "text-bad",
    icon: <Siren className="w-4 h-4" />,
  },
  warn: {
    ring: "border-warn/40",
    bg: "bg-warn/5",
    text: "text-warn",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  info: {
    ring: "border-accent/40",
    bg: "bg-accent/5",
    text: "text-accent",
    icon: <Info className="w-4 h-4" />,
  },
};

const SNOOZE_OPTIONS: { id: SnoozePreset; label: string }[] = [
  { id: "1h", label: "1 hour" },
  { id: "tomorrow", label: "Tomorrow 8 AM" },
  { id: "3d", label: "3 days" },
  { id: "1w", label: "1 week" },
];

export function AlertCard(props: AlertCardProps) {
  const tone = TONE[props.severity];
  const [pending, start] = useTransition();
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const acknowledged = !!props.acknowledgedAt;
  const resolved = !!props.resolvedAt;
  const snoozed =
    !!props.snoozedUntil && new Date(props.snoozedUntil).getTime() > Date.now();
  const meta = alertMeta(props.kind);
  const payload = parseAlertPayload(props.payloadJson ?? null);
  const action = alertAction(props.kind, payload);

  return (
    <div
      className={
        "rounded-xl border p-4 transition " +
        (resolved
          ? "border-border-soft bg-bg-soft/40 opacity-70"
          : snoozed
          ? "border-border bg-bg-soft/60 opacity-80"
          : acknowledged
          ? "border-border bg-bg-soft"
          : `${tone.ring} ${tone.bg}`)
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            "mt-0.5 " +
            (resolved || snoozed
              ? "text-ink-faint"
              : acknowledged
              ? "text-ink-dim"
              : tone.text)
          }
        >
          {snoozed ? <Clock className="w-4 h-4" /> : tone.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm font-semibold">{props.title}</div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-soft border border-border-soft text-ink-faint">
              {meta.label}
            </span>
            <span
              className={
                "text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded " +
                (resolved
                  ? "bg-bg-hover text-ink-faint"
                  : snoozed
                  ? "bg-bg-hover text-ink-faint"
                  : acknowledged
                  ? "bg-bg-hover text-ink-faint"
                  : `${tone.bg} ${tone.text} border ${tone.ring}`)
              }
            >
              {resolved
                ? "resolved"
                : snoozed
                ? "snoozed"
                : acknowledged
                ? "ack"
                : props.severity}
            </span>
            <span className="text-[10px] text-ink-faint">
              {fmtRelative(new Date(props.createdAt))}
            </span>
          </div>
          {props.body && (
            <div className="text-sm text-ink-dim mt-1 whitespace-pre-line">
              {props.body}
            </div>
          )}
          {props.suggestion && (
            <div className="text-xs text-ink mt-2 italic">
              → {props.suggestion}
            </div>
          )}
          {action && !resolved && (
            <Link
              href={action.href}
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-2 font-medium"
            >
              {action.label}
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
          {snoozed && props.snoozedUntil && (
            <div className="text-[11px] text-ink-faint mt-2 flex items-center gap-1.5 flex-wrap">
              <Clock className="w-3 h-3" />
              Snoozed until {fmtRelative(new Date(props.snoozedUntil))}
              {props.snoozedBy ? ` · by ${props.snoozedBy}` : ""}
              {props.canSnooze && (
                <button
                  type="button"
                  onClick={() =>
                    start(() => {
                      void snoozeAlert(props.id, "clear");
                    })
                  }
                  disabled={pending}
                  className="text-accent hover:underline ml-1"
                >
                  unsnooze
                </button>
              )}
            </div>
          )}
          {acknowledged && !resolved && !snoozed && props.acknowledgedBy && (
            <div className="text-[11px] text-ink-faint mt-2">
              Acknowledged by {props.acknowledgedBy}
              {props.acknowledgedAt
                ? ` · ${fmtRelative(new Date(props.acknowledgedAt))}`
                : ""}
            </div>
          )}
        </div>
        {(props.canAck || props.canSnooze || props.canDelete) && (
          <div className="flex items-center gap-1 shrink-0 relative">
            {props.canAck &&
              !resolved &&
              (acknowledged ? (
                <button
                  type="button"
                  onClick={() =>
                    start(() => {
                      void unackAlert(props.id);
                    })
                  }
                  disabled={pending}
                  className="btn-ghost text-xs"
                  title="Unacknowledge"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    start(() => {
                      void ackAlert(props.id);
                    })
                  }
                  disabled={pending}
                  className="btn-ghost text-xs text-good hover:text-good border-good/30"
                  title="Acknowledge"
                >
                  <Check className="w-3.5 h-3.5" /> Ack
                </button>
              ))}
            {props.canSnooze && !resolved && !snoozed && (
              <button
                type="button"
                onClick={() => setSnoozeOpen((o) => !o)}
                disabled={pending}
                className="btn-ghost text-xs"
                title="Snooze"
              >
                <BellOff className="w-3.5 h-3.5" />
              </button>
            )}
            {snoozeOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-20 w-40 card p-1 border-border"
                onMouseLeave={() => setSnoozeOpen(false)}
              >
                <div className="text-[10px] uppercase text-ink-faint px-2 py-1">
                  Remind me in
                </div>
                {SNOOZE_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setSnoozeOpen(false);
                      start(() => {
                        void snoozeAlert(props.id, o.id);
                      });
                    }}
                    className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-bg-hover flex items-center gap-2"
                  >
                    <Bell className="w-3 h-3 text-ink-faint" />
                    {o.label}
                  </button>
                ))}
              </div>
            )}
            {props.canDelete && (
              <button
                type="button"
                onClick={() => {
                  if (
                    !confirm(
                      "Delete this alert permanently? It will stay hidden even if the condition returns.",
                    )
                  )
                    return;
                  start(() => {
                    void deleteAlert(props.id);
                  });
                }}
                disabled={pending}
                className="btn-ghost text-xs text-bad hover:text-bad border-bad/30"
                title="Delete (admin)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
