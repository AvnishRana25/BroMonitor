"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { fmtDateTime } from "@/lib/utils";
import { generateTestBriefNow } from "@/app/reports/actions";

export type ExistingBrief = {
  id: string;
  body: string;
  generatedAt: string;
  model: string | null;
} | null;

export function TestBriefPanel({
  upcomingTestId,
  daysAway,
  existing,
  geminiConfigured,
}: {
  upcomingTestId: string;
  daysAway: number;
  existing: ExistingBrief;
  geminiConfigured: boolean;
}) {
  const [brief, setBrief] = useState<ExistingBrief>(existing);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!geminiConfigured) {
    return (
      <div className="mt-4 border-t border-border-soft pt-3 text-xs text-ink-faint flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" />
        AI briefs need <code className="text-[10px]">GEMINI_API_KEY</code> on the
        server (Vercel env).
      </div>
    );
  }

  const farOut = daysAway > 7;

  return (
    <div className="mt-4 border-t border-border-soft pt-3">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="text-xs uppercase tracking-wide text-accent font-medium flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          AI focus brief
        </div>
        <div className="flex items-center gap-2">
          {brief && (
            <span className="text-[11px] text-ink-faint">
              Generated {fmtDateTime(brief.generatedAt)}
            </span>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              start(async () => {
                const res = await generateTestBriefNow(upcomingTestId, {
                  overwrite: true,
                });
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                try {
                  const resp = await fetch(`/api/reports/${res.id}`, {
                    cache: "no-store",
                  });
                  if (!resp.ok) {
                    const j = (await resp.json().catch(() => null)) as
                      | { error?: string }
                      | null;
                    setError(
                      j?.error ??
                        `Brief saved but could not load (status ${resp.status}). Refresh the page.`,
                    );
                    return;
                  }
                  const r = await resp.json();
                  setBrief({
                    id: r.id,
                    body: r.body,
                    generatedAt: r.generatedAt,
                    model: r.model,
                  });
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? `Brief saved but fetch failed: ${e.message}. Refresh the page.`
                      : "Brief saved but fetch failed. Refresh the page.",
                  );
                }
              });
            }}
            className="btn-ghost text-xs"
            title={brief ? "Regenerate" : "Generate"}
          >
            {pending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {brief ? "Refresh" : "Generate brief"}
          </button>
        </div>
      </div>
      {farOut && !brief && (
        <p className="text-[11px] text-ink-faint mb-2">
          Test is {daysAway} days away — you can generate a brief now; the daily
          cron also refreshes briefs automatically in the last 7 days before the
          exam.
        </p>
      )}
      {error && (
        <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg px-2.5 py-1.5 mb-2">
          {error}
        </div>
      )}
      {brief ? (
        <div className="text-sm text-ink whitespace-pre-line leading-relaxed bg-bg-soft border border-border-soft rounded-lg p-3 max-h-[min(420px,50vh)] overflow-y-auto">
          {brief.body}
        </div>
      ) : (
        <div className="text-xs text-ink-faint">
          No brief yet. Generate a day-by-day revision plan from his syllabus
          and recent logs.
        </div>
      )}
    </div>
  );
}
