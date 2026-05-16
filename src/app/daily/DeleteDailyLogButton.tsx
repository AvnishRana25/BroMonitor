"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteDailyLog } from "./actions";

export function DeleteDailyLogButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this daily log? This cannot be undone.")) return;
        start(() => {
          void deleteDailyLog(id);
        });
      }}
      className="btn-ghost text-bad hover:text-bad border-bad/30"
      title="Delete log"
    >
      <Trash2 className="w-3.5 h-3.5" /> Delete
    </button>
  );
}
