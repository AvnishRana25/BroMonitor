# BroMonitor

A study tracker for one Class 11 brother and his father. Single household, three roles (`student`, `guardian`, `admin`), no SaaS scaffolding, deploys to Vercel.

## What it tracks

- **Daily log** — school / coaching / self-study hours, sleep last night, energy 1–5, per-subject syllabus rows (subject + chapter + topic, or free-text sub-topic), problems solved, homework done, free-form notes. Logs are editable; only admin can delete.
- **Daily reflection** — three short prompts (concepts learned, confusion points, hardest problem solved) saved per day. 90 seconds of honest reflection beats two hours of pretending to study.
- **Daily evidence** — notebook / solved-problem photos attached to the day's log, hosted on Cloudinary. Up to 12 photos per log, 8 MB each. The daily ritual requires at least one photo + one syllabus row before save.
- **Smart Daily Log** (AI) — at `/daily/new`, the brother can paste one line of plain English (e.g. *"did 2hr school, 3hr coaching, covered laws of motion + a bit of gravitation, 20 problems, chem hw pending"*) and Gemini parses it into a pre-filled form he confirms in 20 seconds.
- **Weekly plan** (`/plan`, guardian/admin) — Monday-of-week per-subject hour targets, tests goal, revision sessions goal. The dashboard compares this against actual tracked time and fires a `plan_behind` alert when reality drifts.
- **Alerts** (`/alerts`, guardian/admin) — a deterministic 14-rule engine (`src/lib/rules.ts`). Acknowledge, snooze (1 h → 1 week), or permanently dismiss. Active alerts are grouped by category (Wellbeing / Outcomes / Trust / etc.) for fast scan. Bulk-ack lets father catch up after a few days away. Snoozed alerts hide automatically and re-appear after their deadline.
- **Father's notes** — `GuardianComment` lets father leave general or day-specific notes. Brother sees them inline on the dashboard. Two-way artifact, not just surveillance.
- **Subjects** — full NCERT Class 11 syllabus seeded for Physics, Chemistry, Maths. Each chapter has its standard topic list. Mark each topic with a status (not started → class taught → self studied → problems done → revised → mastered), confidence (0–5), problems solved, mistakes made.
- **Tests** — log past tests with subject-wise breakdown; schedule upcoming tests with date / type / max marks / duration / subject + chapter syllabus / prep plan.
- **Doubts** — open queue with subject, chapter, topic and **optional image of the problem** (snap a photo from the textbook). The image is uploaded to Cloudinary and sent to Gemini Vision when "Ask AI" is clicked, so the brother can solve handwritten / printed problems just by photographing them.
- **AI Doubt Solver** — Gemini gives a Class-11-appropriate step-by-step first-pass. When an image is attached, the prompt makes Gemini transcribe what it sees before solving, so accuracy is self-checked. The answer is shown with a clear "low confidence" chip when Gemini flagged uncertainty.
- **AI reports** (`/reports`, guardian/admin) — three flavours, all idempotent and emailable:
  - **Weekly** — every Sunday, ~200-word plain-English narrative for father. Hours, mastery, tests, doubts, wellbeing, missed logs. One strength, one concern, one action.
  - **Monthly** — month-over-month synthesis with hours/test-score deltas, subject balance, mastery growth, consistency streaks, next-month focus.
  - **Test brief** — surfaces on each upcoming-test card within 7 days. Cross-references per-topic status/confidence with the test syllabus to produce a day-by-day revision plan.
- **Dashboard** — Executive Summary (this week's tracked hours vs plan, consistency, open red alerts, next-test countdown, subject mastery), Planned vs Actual strip, top-3 alerts (severity-ordered), Father's notes feed, 7-day stacked-hours chart, syllabus mastery radial, test-score trend, today's reflection, upcoming tests, open doubts.

## Who can do what

PIN-gated. Server actions enforce permissions via `requireRole`; UI hides buttons via `can(role, action)`.

| Action                                | Brother (student) | Father (guardian) | You (admin) |
| ------------------------------------- | :---------------: | :---------------: | :---------: |
| View dashboard                        |        ✓          |        ✓          |      ✓      |
| Add / edit daily log + reflection     |        ✓          |        —          |      ✓      |
| Upload evidence photos                |        ✓          |        —          |      ✓      |
| Smart Daily Log (AI parse)            |        ✓          |        —          |      ✓      |
| Update topic status / confidence      |        ✓          |        —          |      ✓      |
| Raise / delete / resolve doubts       |        ✓          |        —          |      ✓      |
| Attach image to a doubt               |        ✓          |        —          |      ✓      |
| Ask AI for a doubt first-pass         |        ✓          |        ✓          |      ✓      |
| Log past test scores                  |        ✓          |        —          |      ✓      |
| Schedule upcoming tests               |        ✓          |        —          |      ✓      |
| Generate AI test brief                |        ✓          |        ✓          |      ✓      |
| **View / ack / snooze alerts**        |        —          |        ✓          |      ✓      |
| **Edit weekly plan**                  |        —          |        ✓          |      ✓      |
| **Leave guardian comments**           |        —          |        ✓          |      ✓      |
| **View / generate / email AI reports**|        —          |        ✓          |      ✓      |
| Delete logs / tests / chapters / alerts / reports | — | — |      ✓      |

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind (dark UI)
- Prisma ORM on **Postgres** (Neon / Vercel Postgres). Local dev points at the same Postgres or any other.
- **Cloudinary** for image storage (daily-log evidence + doubt images)
- Google `@google/generative-ai` (text + vision)
- Nodemailer for the report email path (optional)
- Vercel Cron for the daily AI report tick
- PWA manifest at `/manifest.webmanifest` so the app installs to home screen on iOS / Android

## Deploy to Vercel (production)

This is the path that lets father / brother / you open it from any device on any network.

### 1. Provision a Postgres database

In the Vercel dashboard:

1. **Storage → Create database → Postgres (Neon)**.
2. Connect it to this project. Vercel writes `DATABASE_URL` and `DIRECT_DATABASE_URL` automatically into the project's env vars.

### 2. Provision Cloudinary

1. Sign up free at https://cloudinary.com (25 GB / month is well beyond what one household needs).
2. From the Cloudinary dashboard, copy **Cloud name**, **API key**, **API secret**.

### 3. Set every env var in Vercel

Project → Settings → Environment Variables. Paste each row from `.env.example`:

| Var                                            | Where to get it                                                 |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`, `DIRECT_DATABASE_URL`          | Vercel Postgres integration (auto-populated)                    |
| `APP_SECRET`                                   | Generate: `openssl rand -hex 32`                                |
| `PIN_STUDENT`, `PIN_GUARDIAN`, `PIN_ADMIN`     | Anything you want                                               |
| `GEMINI_API_KEY`                               | https://aistudio.google.com/app/apikey                          |
| `GEMINI_MODEL`                                 | `gemini-2.5-flash` (recommended) or `gemini-2.5-flash-lite`     |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Cloudinary dashboard                                      |
| `SMTP_*` and `REPORT_EMAIL_*`                  | Optional. For Gmail, use an App Password.                       |
| `CRON_SECRET`                                  | Generate: `openssl rand -hex 32`. Vercel Cron sends it.         |

### 4. Push the schema

Once the env vars are set, run from your laptop:

```bash
npx prisma migrate deploy
# (or, if you'd rather skip migrations and just sync the schema:)
npx prisma db push
```

This points at the `DATABASE_URL` you exported locally — make sure it's the Neon production URL, not `file:./dev.db`.

### 5. (Optional) Migrate your local dev data

If you already have data in `prisma/dev.db` you want on production:

```bash
# DATABASE_URL must be the Neon postgres:// URL during this step
npx tsx scripts/migrate-sqlite-to-postgres.ts
```

The script is read-only against `dev.db`, copies every table in parent-first order, and uses `skipDuplicates` so it's safe to re-run.

### 6. Deploy

```bash
vercel deploy --prod
# or just push to main if Vercel git integration is enabled
```

After the first deploy, visit your Vercel URL, complete `/unlock`, and the dashboard renders against Neon.

### 7. Share the URL

Send the Vercel URL to your father. On his phone he can **"Add to Home Screen"** (Safari → Share → Add to Home Screen; Chrome → menu → Install app) and BroMonitor opens like a native app. Same for the brother on his phone — works from any Wi-Fi / data network.

### 8. Cron schedule

`vercel.json` registers exactly one cron entry:

```
/api/cron/daily-tick  →  every day at 13:00 UTC (= 18:30 IST)
```

That single tick:

- always refreshes test briefs for any upcoming tests within 7 days
- on **Sundays**, generates + emails the past week's weekly report
- on the **1st of the month**, generates + emails last month's monthly report

Auth is automatic: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. The same endpoint also accepts the historical `x-cron-secret: <secret>` header for manual / GitHub-Action calls.

The original per-feature endpoints still exist for manual triggers:

| Route                              | Method | Use                                |
| ---------------------------------- | ------ | ---------------------------------- |
| `POST /api/cron/weekly-report`     | POST   | Force regenerate the weekly report |
| `POST /api/cron/monthly-report`    | POST   | Force regenerate the monthly report |
| `POST /api/cron/test-briefs`       | POST   | Force refresh test briefs          |
| `GET\|POST /api/cron/daily-tick`   | both   | The Vercel-cron entry point        |

## Local development

Local dev runs against the same Postgres as prod (cheapest path), or you can point at a local Postgres / Neon dev branch.

```bash
# 1. Install deps
npm install

# 2. Copy .env.example → .env and fill in the values
#    (use the same Vercel Postgres URL, or spin up a free dev branch in Neon)
cp .env.example .env

# 3. Push schema + seed NCERT syllabus
npx prisma db push
npm run db:seed

# 4. Run
npm run dev
# open http://localhost:3000  →  redirects to /unlock
```

For a production-style run: `npm run build && npm start`.

Useful one-offs:

```bash
npm run typecheck   # tsc --noEmit, fast feedback
npm run lint        # next lint
npm run check       # typecheck + lint (run before pushing)
npm run db:studio   # Prisma Studio against the configured DB
```

### What if I don't want to set up Cloudinary right away?

`savePhotoBytes` falls back to the local filesystem (`./uploads/`) when `CLOUDINARY_*` is unset. That's only viable on a single machine — Vercel has no persistent filesystem, so any deploy without Cloudinary credentials will lose photos on the next cold start. The doubt-image-upload feature is hard-gated on Cloudinary being configured (the UI disables the "Attach photo" button with a tooltip).

### What if I don't want to set up Gemini right away?

Every AI feature degrades gracefully: the buttons either don't appear or surface a clear "set GEMINI_API_KEY" hint instead of throwing.

### What if I don't want to set up SMTP right away?

Reports save and are viewable in `/reports` — the "Email" button returns a clean "Email is not configured" message.

## The rules engine

14 deterministic rules run on every dashboard render (`src/lib/rules.ts`). No LLMs — when an alert fires, you can explain exactly why.

| Rule                  | Triggers when…                                                              | Severity     |
| --------------------- | --------------------------------------------------------------------------- | ------------ |
| `no_recent_study`     | No daily-log row for a subject in 5+ days                                   | warn → red @10d |
| `test_declining`      | Last 3 tests monotonically down, ≥8pp total drop, latest < 75%              | warn → red @15pp or <50% |
| `stale_doubts`        | Open doubts unresolved for 7+ days                                          | warn → red @5+ or 14d+ |
| `low_sleep_streak`    | 3+ consecutive days of sleep < 6h                                           | warn → red @5d |
| `burnout_precursor`   | 8h+ study AND <6h sleep on a day in the last 3                              | warn → red @2 |
| `low_energy_streak`   | 3+ consecutive days with energy rated ≤ 2                                   | warn → red @5d |
| `homework_backlog`    | 5+ pending or 2+ overdue                                                    | warn → red @10 or 4 overdue |
| `log_gap`             | No daily log for today AND yesterday                                        | warn → red @4d |
| `plan_behind`         | Tracked < 70% of plan pro-rated by days elapsed (after day 3)               | warn → red @<40% |
| `low_daily_evidence`  | No notebook photos for 3 days in a row                                      | warn         |
| `log_without_evidence`| Today logged study but no photos attached                                   | warn         |
| `ritual_incomplete`   | Today's log missing a photo and/or a real chapter+topic row                 | warn         |
| `weak_reflection`     | 3 of last 5 logs have blank reflection                                      | info         |
| `weekend_log_slip`    | It's Sat/Sun and the recent weekend days are unlogged                       | info         |

Each alert is keyed by a stable `dedupeKey` (e.g. `no_recent_study:<subjectId>`). The evaluator:

- **Upserts** existing rows in place so father's acknowledgement persists.
- **Respects snoozes** — a snoozed alert is left alone until `snoozedUntil` passes; even if the rule keeps firing, the alert stays parked.
- **Resolves** alerts whose condition no longer fires.
- Honours admin **dismissals** (`AlertDismissal`) so a permanently-suppressed `dedupeKey` never recreates.

## How the AI features are wired

Every AI call goes through `src/lib/ai/gemini.ts`, which:

- Reads `GEMINI_API_KEY` from env (clear `GeminiNotConfiguredError` if missing)
- Reads `GEMINI_MODEL` (defaults to `gemini-2.5-flash`)
- Enforces a 45-second hard timeout so cron jobs can't hang
- Retries 429 rate-limits with exponential backoff that honours the server-supplied `retryDelay`
- Translates "model unavailable" (404 or `limit: 0`) into a one-line hint telling you which models *are* valid for your project
- Accepts optional `images: [{ bytes, mime }]` for multimodal calls (Gemini Vision)

The AI surfaces live in `src/lib/ai/*.ts`:

- `weeklyReport.ts` — one week of data → 200-word father-friendly narrative
- `monthlyReport.ts` — same shape, month-over-month with deltas
- `testBrief.ts` — per-topic state × test syllabus → day-by-day plan
- `parseLog.ts` — JSON mode + strict schema, returns fields the Daily Log form pre-fills
- `doubt.ts` — text+image first-pass with "say so if you're not confident" guardrail; when an image is attached, the prompt asks Gemini to transcribe the question before solving so accuracy is self-checked

## Data model (high level)

```
Student (1) ── implicit owner of everything

Subject (3) ── Chapter (n) ── Topic (n)            # syllabus spine
                       └── status, confidence, problems, mistakes

DailyLog (1 per date)                              # editable; admin-only delete
  ├── DailyEntry (n)        # (subject, source, chapter) studied that day
  ├── DailyReflection (0..1)
  └── Photo (n)             # Cloudinary publicId/url; legacy filename for old rows
  plus: sleepHours, energy

StudyPlan (1 per week)                             # father's contract
  └── StudyPlanSubject (per subject + hoursGoal)

Alert + AlertDismissal                             # rules-engine output
  kind, severity, dedupeKey, snoozedUntil, snoozedBy
  title, body, suggestion, payload (JSON),
  acknowledgedAt, acknowledgedBy, resolvedAt

GuardianComment                                    # father's notes
Test + TestScore                                   # past tests
UpcomingTest + UpcomingTestSubject                 # scheduled tests
Doubt                                              # raised; optional image; optional AI first-pass
Homework                                           # pending list
AiReport                                           # Gemini output cache
```

See `prisma/schema.prisma` for the full schema with indexes.

## Acceptance checklist

If a deploy is healthy you should see:

- `/unlock` loads with all three role buttons enabled (or only the ones whose PINs are set)
- after signing in as `student`, the daily form opens at `/daily/new`, "Attach photo" works (Cloudinary upload succeeds)
- `/doubts` lets you add a doubt with or without an image, and "Ask AI" returns a step-by-step answer
- after signing in as `guardian`, `/alerts` shows the rules engine output with snooze / ack buttons working
- `/reports` shows weekly / monthly / test-brief tabs; "Generate now" produces a non-empty report
- `vercel logs --since=1d` shows the daily cron firing without 401/403
