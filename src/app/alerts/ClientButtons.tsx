"use client";

import { useTransition } from "react";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { clearResolved, reevaluate } from "./actions";

export function ReevalButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(() => {
          void reevaluate();
        })
      }
      className="btn-ghost text-xs"
      title="Re-run the rules engine"
    >
      {pending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <RefreshCw className="w-3.5 h-3.5" />
      )}
      Re-evaluate
    </button>
  );
}

export function ClearResolvedButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Permanently delete all resolved alerts?")) return;
        start(() => {
          void clearResolved();
        });
      }}
      className="btn-ghost text-xs text-bad hover:text-bad border-bad/30"
    >
      <Trash2 className="w-3.5 h-3.5" /> Clear resolved
    </button>
  );
}
