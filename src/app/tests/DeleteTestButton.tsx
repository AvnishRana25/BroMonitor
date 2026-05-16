"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteTest } from "./actions";

export function DeleteTestButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this test?")) return;
        start(() => {
          void deleteTest(id);
        });
      }}
      className="btn-ghost text-bad hover:text-bad"
      title="Delete"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
