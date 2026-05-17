"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import {
  parseLogTextAction,
  type ParseLogResult,
} from "@/app/daily/new/aiActions";
import type { ParsedLog } from "@/lib/ai/parseLog";

export function SmartLogPaste({
  onParsed,
}: {
  onParsed: (parsed: ParsedLog) => void;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost text-xs"
        title="Type one line and let AI fill the form"
      >
        <Sparkles className="w-3.5 h-3.5" /> Type-to-log (AI)
      </button>
    );
  }

  return (
    <div className="card p-3 sm:p-4 border-accent/30 bg-accent/5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-xs font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          Describe today in one line
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setText("");
            setError(null);
          }}
          className="text-ink-faint hover:text-ink"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <textarea
        rows={2}
        value={text}
        disabled={pending}
        onChange={(e) => setText(e.target.value)}
        className="input resize-none text-sm"
        placeholder="e.g. did 2 hrs school, 3 hrs coaching, covered laws of motion + some gravitation, solved 20 problems, homework pending for chem"
      />
      {error && (
        <div className="mt-2 text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg px-2.5 py-1.5">
          {error}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-ink-faint">
          AI will pre-fill the form. Review before saving.
        </span>
        <button
          type="button"
          disabled={pending || text.trim().length < 5}
          onClick={() => {
            setError(null);
            start(async () => {
              const res: ParseLogResult = await parseLogTextAction(text);
              if (!res.ok) {
                setError(res.error);
                return;
              }
              onParsed(res.data);
              setOpen(false);
              setText("");
            });
          }}
          className="btn-primary text-xs"
        >
          {pending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Parsing…
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" /> Parse with AI
            </>
          )}
        </button>
      </div>
    </div>
  );
}
