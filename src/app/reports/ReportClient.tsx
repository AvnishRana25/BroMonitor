"use client";

import { useState, useTransition } from "react";
import {
  CalendarRange,
  FileText,
  Mail,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { fmtDateTime } from "@/lib/utils";
import {
  deleteReport,
  emailReportNow,
  generateMonthlyNow,
  generateWeeklyNow,
} from "./actions";

export type ReportRow = {
  id: string;
  kind: string;
  scopeKey: string;
  title: string;
  body: string;
  model: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  generatedAt: string;
  emailedAt: string | null;
  emailedTo: string | null;
};

export function ReportClient({
  weekly,
  monthly,
  testBriefs,
  geminiConfigured,
  emailConfigured,
  canDelete,
}: {
  weekly: ReportRow[];
  monthly: ReportRow[];
  testBriefs: ReportRow[];
  geminiConfigured: boolean;
  emailConfigured: boolean;
  canDelete: boolean;
}) {
  const [tab, setTab] = useState<"weekly" | "monthly" | "test_brief">("weekly");
  const rows = tab === "weekly" ? weekly : tab === "monthly" ? monthly : testBriefs;

  return (
    <div className="space-y-5">
      {!geminiConfigured && (
        <div className="card p-4 border-warn/40 bg-warn/10 text-sm">
          <div className="font-semibold mb-1">Gemini API key not set</div>
          Add <code>GEMINI_API_KEY</code> to <code>.env</code> and restart the
          dev server. Get a key at{" "}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-accent"
          >
            aistudio.google.com
          </a>
          .
        </div>
      )}
      {geminiConfigured && !emailConfigured && (
        <div className="card p-4 border-accent/30 bg-accent/5 text-sm">
          Reports will be saved here. To email them, fill the{" "}
          <code>SMTP_*</code> and <code>REPORT_EMAIL_*</code> values in{" "}
          <code>.env</code>.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-2">
          <TabButton
            label={`Weekly (${weekly.length})`}
            active={tab === "weekly"}
            onClick={() => setTab("weekly")}
          />
          <TabButton
            label={`Monthly (${monthly.length})`}
            active={tab === "monthly"}
            onClick={() => setTab("monthly")}
          />
          <TabButton
            label={`Test briefs (${testBriefs.length})`}
            active={tab === "test_brief"}
            onClick={() => setTab("test_brief")}
          />
        </div>
        <div className="flex gap-2">
          {tab === "weekly" && <GenerateWeeklyButton disabled={!geminiConfigured} />}
          {tab === "monthly" && (
            <GenerateMonthlyButton disabled={!geminiConfigured} />
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">
          {tab === "test_brief"
            ? "No test briefs yet. Generate one from a scheduled test on /tests."
            : "Nothing here yet. Use the button above to generate one."}
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <ReportItem
              key={r.id}
              row={r}
              canEmail={emailConfigured && (r.kind === "weekly" || r.kind === "monthly")}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "chip text-xs " +
        (active ? "bg-accent/20 border-accent/50 text-accent" : "")
      }
    >
      {label}
    </button>
  );
}

function GenerateWeeklyButton({ disabled }: { disabled: boolean }) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      {status && <span className="text-xs text-ink-faint">{status}</span>}
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() =>
          start(async () => {
            const res = await generateWeeklyNow({ overwrite: true });
            setStatus(
              res.ok
                ? res.regenerated
                  ? "Generated."
                  : "Loaded existing."
                : `Error: ${res.error}`
            );
          })
        }
        className="btn-primary text-xs"
      >
        {pending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5" />
        )}
        Generate this week
      </button>
    </div>
  );
}

function GenerateMonthlyButton({ disabled }: { disabled: boolean }) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      {status && <span className="text-xs text-ink-faint">{status}</span>}
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() =>
          start(async () => {
            const res = await generateMonthlyNow({ overwrite: true });
            setStatus(
              res.ok
                ? res.regenerated
                  ? "Generated."
                  : "Loaded existing."
                : `Error: ${res.error}`
            );
          })
        }
        className="btn-primary text-xs"
      >
        {pending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5" />
        )}
        Generate last month
      </button>
    </div>
  );
}

function ReportItem({
  row,
  canEmail,
  canDelete,
}: {
  row: ReportRow;
  canEmail: boolean;
  canDelete: boolean;
}) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            {row.kind === "weekly" ? (
              <CalendarRange className="w-4 h-4 text-accent" />
            ) : row.kind === "monthly" ? (
              <FileText className="w-4 h-4 text-accent" />
            ) : (
              <FileText className="w-4 h-4 text-accent" />
            )}
            {row.title}
          </div>
          <div className="text-[11px] text-ink-faint mt-0.5">
            Generated {fmtDateTime(row.generatedAt)}
            {row.model ? ` · ${row.model}` : ""}
            {row.tokensIn != null
              ? ` · ${row.tokensIn}/${row.tokensOut ?? 0} tokens`
              : ""}
            {row.emailedAt
              ? ` · Emailed to ${row.emailedTo} ${fmtDateTime(row.emailedAt)}`
              : ""}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {canEmail && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await emailReportNow(row.id);
                  setStatus(
                    res.ok ? `Emailed to ${res.to}.` : `Error: ${res.error}`
                  );
                })
              }
              className="btn-ghost text-xs"
              title="Email this report"
            >
              {pending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Mail className="w-3.5 h-3.5" />
              )}
              Email
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm("Delete this report?")) return;
                start(() => deleteReport(row.id));
              }}
              className="btn-ghost text-bad hover:text-bad text-xs"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="text-sm text-ink whitespace-pre-line leading-relaxed">
        {row.body}
      </div>
      {status && (
        <div className="mt-3 text-xs text-ink-faint">{status}</div>
      )}
    </div>
  );
}
