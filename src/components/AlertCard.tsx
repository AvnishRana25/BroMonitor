"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Info,
  RotateCcw,
  Siren,
  Trash2,
} from "lucide-react";
import { fmtRelative } from "@/lib/utils";
import { ackAlert, deleteAlert, unackAlert } from "@/app/alerts/actions";
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
  canAck: boolean;
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

export function AlertCard(props: AlertCardProps) {
  const tone = TONE[props.severity];
  const [pending, start] = useTransition();
  const acknowledged = !!props.acknowledgedAt;
  const resolved = !!props.resolvedAt;
  const meta = alertMeta(props.kind);
  const payload = parseAlertPayload(props.payloadJson ?? null);
  const action = alertAction(props.kind, payload);

  return (
    <div
      className={
        "rounded-xl border p-4 transition " +
        (resolved
          ? "border-border-soft bg-bg-soft/40 opacity-70"
          : acknowledged
          ? "border-border bg-bg-soft"
          : `${tone.ring} ${tone.bg}`)
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            "mt-0.5 " + (resolved ? "text-ink-faint" : acknowledged ? "text-ink-dim" : tone.text)
          }
        >
          {tone.icon}
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
                  : acknowledged
                  ? "bg-bg-hover text-ink-faint"
                  : `${tone.bg} ${tone.text} border ${tone.ring}`)
              }
            >
              {resolved ? "resolved" : acknowledged ? "ack" : props.severity}
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
          {acknowledged && !resolved && props.acknowledgedBy && (
            <div className="text-[11px] text-ink-faint mt-2">
              Acknowledged by {props.acknowledgedBy}
              {props.acknowledgedAt
                ? ` · ${fmtRelative(new Date(props.acknowledgedAt))}`
                : ""}
            </div>
          )}
        </div>
        {(props.canAck || props.canDelete) && (
          <div className="flex items-center gap-1 shrink-0">
            {props.canAck && !resolved && (acknowledged ? (
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
            {props.canDelete && (
              <button
                type="button"
                onClick={() => {
                  if (
                    !confirm(
                      "Delete this alert permanently? It will stay hidden even if the condition returns."
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
