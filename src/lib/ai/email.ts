// Optional SMTP delivery. If env is incomplete we skip cleanly — the report
// is still saved in the DB and visible in /reports. No silent crashes.

import "server-only";
import nodemailer from "nodemailer";

export type EmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
};

export function emailConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.REPORT_EMAIL_FROM?.trim() || user;
  const to = process.env.REPORT_EMAIL_TO?.trim();
  if (!host || !user || !pass || !from || !to) return null;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = (process.env.SMTP_SECURE || "true").toLowerCase() !== "false";
  return { host, port, secure, user, pass, from, to };
}

export function isEmailConfigured(): boolean {
  return emailConfig() !== null;
}

let cached: nodemailer.Transporter | null = null;
function transporter(cfg: EmailConfig) {
  if (cached) return cached;
  cached = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  return cached;
}

export async function sendReportEmail(opts: {
  subject: string;
  /** Plain text — we render a minimal HTML wrapper too. */
  text: string;
  /** Override recipient (defaults to REPORT_EMAIL_TO). */
  to?: string;
}): Promise<{ sent: boolean; to: string; reason?: string }> {
  const cfg = emailConfig();
  if (!cfg) {
    return {
      sent: false,
      to: opts.to ?? "(unset)",
      reason: "SMTP not configured (set SMTP_* + REPORT_EMAIL_* in .env).",
    };
  }
  const to = opts.to ?? cfg.to;
  await transporter(cfg).sendMail({
    from: cfg.from,
    to,
    subject: opts.subject,
    text: opts.text,
    html: toMinimalHtml(opts.text),
  });
  return { sent: true, to };
}

function toMinimalHtml(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px 0;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.55;color:#111;max-width:640px;margin:0 auto;padding:24px;">${paragraphs}</body></html>`;
}
