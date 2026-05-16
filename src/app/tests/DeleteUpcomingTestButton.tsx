"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteUpcomingTest } from "./actions";

export function DeleteUpcomingTestButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this scheduled test?")) return;
        start(() => {
          void deleteUpcomingTest(id);
        });
      }}
      className="btn-ghost text-bad hover:text-bad"
      title="Delete"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
