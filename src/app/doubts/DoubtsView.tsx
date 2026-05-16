"use client";

import { useState, useTransition } from "react";
import { Plus, Check, RotateCcw, Trash2 } from "lucide-react";
import { SubjectPill } from "@/components/SubjectPill";
import { fmtDate } from "@/lib/utils";
import {
  createDoubt,
  deleteDoubt,
  reopenDoubt,
  resolveDoubt,
} from "./actions";

type Subject = { id: string; name: string; short: string; color: string };

type Doubt = {
  id: string;
  question: string;
  chapter: string | null;
  topic: string | null;
  status: string;
  raisedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  subject: { id: string; short: string; color: string };
};

export function DoubtsView({
  subjects,
  doubts,
}: {
  subjects: Subject[];
  doubts: Doubt[];
}) {
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [pending, startTransition] = useTransition();

  const filtered = doubts.filter((d) =>
    filter === "all" ? true : d.status === filter
  );

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    e.currentTarget.reset();
    startTransition(() => {
      void createDoubt(fd);
    });
  }

  return (
    <div className="space-y-5">
      {/* Add doubt */}
      <form onSubmit={onCreate} className="card p-5 space-y-3">
        <div className="text-base font-semibold">Add a doubt</div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select name="subjectId" required className="input">
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            name="chapter"
            className="input"
            placeholder="Chapter (optional)"
          />
          <input
            name="topic"
            className="input"
            placeholder="Topic (optional)"
          />
          <button
            type="submit"
            disabled={pending}
            className="btn-primary justify-self-end sm:justify-self-stretch"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
          <input
            name="question"
            required
            className="input sm:col-span-4"
            placeholder="What's the doubt? (e.g. why is friction static below threshold?)"
          />
        </div>
      </form>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(["open", "resolved", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition capitalize ${
              filter === f
                ? "bg-accent/15 text-accent border-accent/40"
                : "bg-bg-soft border-border text-ink-dim hover:text-ink"
            }`}
          >
            {f} ({doubts.filter((d) => (f === "all" ? true : d.status === f)).length})
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card p-6 text-center text-sm text-ink-faint">
          {filter === "open" ? "No open doubts. Nice." : "Nothing here."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => (
            <div key={d.id} className="card p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <SubjectPill name={d.subject.short} color={d.subject.color} />
                  <div className="min-w-0">
                    <div className="text-sm">{d.question}</div>
                    <div className="text-xs text-ink-faint mt-1 flex items-center gap-2 flex-wrap">
                      <span>Raised {fmtDate(d.raisedAt)}</span>
                      {d.chapter && <span>· {d.chapter}</span>}
                      {d.topic && <span>· {d.topic}</span>}
                      {d.resolvedAt && (
                        <span className="text-good">
                          · resolved {fmtDate(d.resolvedAt)}
                          {d.resolvedBy ? ` by ${d.resolvedBy}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {d.status === "open" ? (
                    <ResolveMenu id={d.id} />
                  ) : (
                    <button
                      onClick={() =>
                        startTransition(() => {
                          void reopenDoubt(d.id);
                        })
                      }
                      className="btn-ghost text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reopen
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (!confirm("Delete this doubt?")) return;
                      startTransition(() => {
                        void deleteDoubt(d.id);
                      });
                    }}
                    className="btn-ghost text-bad hover:text-bad text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResolveMenu({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const options = ["teacher", "peer", "self", "online"];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="btn-ghost text-xs text-good hover:text-good border-good/30"
      >
        <Check className="w-3.5 h-3.5" /> Resolve
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 z-20 w-40 card p-1 border-border"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="text-[10px] uppercase text-ink-faint px-2 py-1">
            Resolved by
          </div>
          {options.map((o) => (
            <button
              key={o}
              onClick={() => {
                setOpen(false);
                start(() => {
                  void resolveDoubt(id, o);
                });
              }}
              className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-bg-hover capitalize"
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
