// Thin wrapper around the Google Generative AI SDK. Centralised so every
// feature uses the same model, the same env var, and the same error path.
// If GEMINI_API_KEY is missing, callers get a clear NotConfiguredError instead
// of a vague network error from the SDK.

import "server-only";
import {
  GoogleGenerativeAI,
  type GenerateContentResult,
  type Schema,
} from "@google/generative-ai";

export class GeminiNotConfiguredError extends Error {
  constructor() {
    super(
      "GEMINI_API_KEY is not set. Add it to .env (https://aistudio.google.com/app/apikey) and restart the dev server."
    );
    this.name = "GeminiNotConfiguredError";
  }
}

export class GeminiCallError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "GeminiCallError";
  }
}

export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

// Parse the Retry-After hint from a Gemini 429 error message.
// Returns seconds (clamped 1..60) or null if not found.
function parseRetryDelaySec(err: unknown): number | null {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const m = msg.match(/retry in ([0-9.]+)\s*s/i) ?? msg.match(/retryDelay\":\"([0-9.]+)s/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!isFinite(n) || n <= 0) return null;
  return Math.min(60, Math.max(1, Math.ceil(n)));
}

function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /\b429\b/.test(msg) || /Too Many Requests/i.test(msg) || /quota/i.test(msg);
}

function isModelUnavailableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  // "limit: 0" means the chosen model has no free-tier quota for this project.
  // 404 means the model name is wrong or retired (e.g. gemini-1.5-flash).
  // Either way, retrying won't help — surface a clear hint instead.
  return (
    /limit:\s*0/i.test(msg) ||
    /\b404\b/.test(msg) ||
    /is not found/i.test(msg) ||
    /not supported for generateContent/i.test(msg)
  );
}

function friendlyError(err: unknown, modelName: string): GeminiCallError {
  const msg = err instanceof Error ? err.message : String(err ?? "Gemini call failed");
  if (isModelUnavailableError(err)) {
    return new GeminiCallError(
      `Model "${modelName}" isn't available on this Google AI project (got 404 or "limit: 0"). Set GEMINI_MODEL in .env to one of: gemini-2.5-flash, gemini-2.5-flash-lite, or gemini-flash-latest — then restart the dev server. Original: ${msg}`,
      err,
    );
  }
  if (isRateLimitError(err)) {
    return new GeminiCallError(
      `Rate limit hit for "${modelName}". Free tier is roughly 10 req/min and 250 req/day for gemini-2.5-flash. Wait a minute and try again, switch to gemini-2.5-flash-lite for more headroom, or enable billing at https://aistudio.google.com. Original: ${msg}`,
      err,
    );
  }
  return new GeminiCallError(msg, err);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Hard ceiling for a single Gemini call. Without this the SDK can hang
// indefinitely on a stalled HTTP response and freeze cron jobs / server
// actions. 45s is comfortable for 2.5-flash on long reports.
const GEMINI_CALL_TIMEOUT_MS = 45_000;

class GeminiTimeoutError extends Error {
  constructor(modelName: string) {
    super(
      `Gemini call timed out after ${
        GEMINI_CALL_TIMEOUT_MS / 1000
      }s on "${modelName}". Try again, or switch to a smaller model in .env.`,
    );
    this.name = "GeminiTimeoutError";
  }
}

async function withTimeout<T>(fn: () => Promise<T>, modelName: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new GeminiTimeoutError(modelName)),
      GEMINI_CALL_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Retry transient 429s up to 2 times, honoring server-suggested retryDelay
// (capped at 60s so the request doesn't hang). Aborts immediately if the
// model is simply unavailable (limit: 0) or the call times out (no point
// retrying a hung connection right away).
async function withRetry<T>(
  fn: () => Promise<T>,
  modelName: string,
  attempts = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await withTimeout(fn, modelName);
    } catch (err) {
      lastErr = err;
      if (err instanceof GeminiTimeoutError) break;
      if (isModelUnavailableError(err)) break;
      if (!isRateLimitError(err)) break;
      if (i === attempts - 1) break;
      const wait =
        (parseRetryDelaySec(err) ?? Math.min(30, 2 ** i + 1)) * 1000;
      await sleep(wait);
    }
  }
  if (lastErr instanceof GeminiTimeoutError) {
    throw new GeminiCallError(lastErr.message, lastErr);
  }
  throw friendlyError(lastErr, modelName);
}

let cachedClient: GoogleGenerativeAI | null = null;
function client() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new GeminiNotConfiguredError();
  if (!cachedClient) cachedClient = new GoogleGenerativeAI(key);
  return cachedClient;
}

export type GenerateTextOptions = {
  systemInstruction?: string;
  /** 0..2 — keep low (0.2-0.4) for factual reports, higher for creative. */
  temperature?: number;
  /** Override the default model. */
  model?: string;
};

export async function generateText(
  prompt: string,
  opts: GenerateTextOptions = {}
): Promise<{ text: string; tokensIn?: number; tokensOut?: number; model: string }> {
  const modelName = opts.model ?? getGeminiModelName();
  const model = client().getGenerativeModel({
    model: modelName,
    systemInstruction: opts.systemInstruction,
    generationConfig: {
      temperature: opts.temperature ?? 0.3,
    },
  });
  const res: GenerateContentResult = await withRetry(
    () => model.generateContent(prompt),
    modelName,
  );
  const text = res.response.text().trim();
  if (!text) throw new GeminiCallError("Gemini returned an empty response.");
  const usage = res.response.usageMetadata;
  return {
    text,
    tokensIn: usage?.promptTokenCount,
    tokensOut: usage?.candidatesTokenCount,
    model: modelName,
  };
}

export type GenerateJsonOptions<T> = GenerateTextOptions & {
  schema: Schema;
  /** Optional client-side validator; throw if invalid. */
  validate?: (data: unknown) => T;
};

export async function generateJson<T = unknown>(
  prompt: string,
  opts: GenerateJsonOptions<T>
): Promise<{ data: T; tokensIn?: number; tokensOut?: number; model: string }> {
  const modelName = opts.model ?? getGeminiModelName();
  const model = client().getGenerativeModel({
    model: modelName,
    systemInstruction: opts.systemInstruction,
    generationConfig: {
      temperature: opts.temperature ?? 0.1,
      responseMimeType: "application/json",
      responseSchema: opts.schema,
    },
  });
  const res: GenerateContentResult = await withRetry(
    () => model.generateContent(prompt),
    modelName,
  );
  const raw = res.response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new GeminiCallError(
      `Gemini returned non-JSON despite JSON mode. First 200 chars: ${raw.slice(0, 200)}`
    );
  }
  const data = (opts.validate ? opts.validate(parsed) : (parsed as T));
  const usage = res.response.usageMetadata;
  return {
    data,
    tokensIn: usage?.promptTokenCount,
    tokensOut: usage?.candidatesTokenCount,
    model: modelName,
  };
}

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY?.trim();
}
