# BroMonitor

A study tracker for one Class 11 brother and his father. Single household, three roles, no SaaS scaffolding.

## What it tracks

- **Daily log** — school / coaching / self-study hours, sleep last night, energy 1–5, per-subject syllabus rows (subject + chapter + topic, or free-text sub-topic), problems solved, homework done, free-form notes. Logs are editable; only admin can delete.
- **Daily reflection** — three short prompts (concepts learned, confusion points, hardest problem solved) saved per day. Renders on the dashboard and the daily list. 90 seconds of honest reflection beats two hours of pretending to study.
- **Daily evidence** — notebook / solved-problem photos attached to the day's log. The daily ritual requires at least one photo + one syllabus row before save.
- **Smart Daily Log** (AI) — at `/daily/new`, the brother can paste one line of plain English (e.g. *"did 2hr school, 3hr coaching, covered laws of motion + a bit of gravitation, 20 problems, chem hw pending"*) and Gemini parses it into a pre-filled form he confirms in 20 seconds.
- **Weekly plan** (`/plan`, guardian/admin) — Monday-of-week per-subject hour targets, tests goal, revision sessions goal. The dashboard compares this against actual tracked time and fires a `plan_behind` alert when reality drifts.
- **Alerts** (`/alerts`, guardian/admin) — a deterministic rules engine (`src/lib/rules.ts`) that re-evaluates on every dashboard render. 14 rules cover subject neglect, declining test scores, stale doubts, sleep deficits, burnout precursors, low energy streaks, homework backlog, log gaps, plan miss, missing evidence, ritual completeness, weak reflection, and weekend logging slip. Every alert tells you exactly *why* it fired — no AI guessing — and can be acknowledged so it stops nagging until the condition re-occurs. Admin can permanently dismiss alerts.
- **Father's notes** — `GuardianComment` lets father leave general notes or day-specific notes. Brother sees them inline on the dashboard and on `/daily`. Two-way artifact, not just surveillance.
- **Subjects** — full NCERT Class 11 syllabus seeded for Physics, Chemistry, Maths. Each chapter has its standard topic list. Mark each topic with a status (not started → class taught → self studied → problems done → revised → mastered), confidence (0–5), problems solved, mistakes made.
- **Tests** — log past tests with subject-wise breakdown (marks / max / correct / wrong / unattempted / weak topics), rank, percentile, notes. Schedule **upcoming tests** with date, type, max marks, duration, subject + chapter syllabus, prep plan.
- **Doubts** — open-doubt queue with raised date, resolved date, and who resolved it (teacher / peer / self / online / ai).
- **AI Doubt Solver** — on every doubt, an "Ask AI" button calls Gemini for a first-pass Class-11-appropriate explanation. The prompt explicitly tells Gemini to flag low confidence rather than hallucinate, and the answer is shown with a clear "low confidence" chip when relevant. Student can mark "resolved by AI" or leave it open for a teacher.
- **AI reports** (`/reports`, guardian/admin) — three flavours, all idempotent and emailable:
  - **Weekly** — every Sunday, 180–220 word plain-English narrative for father covering hours, mastery, tests, doubts, wellbeing, missed logs. Highlights one strength, one concern, one specific action for the upcoming week.
  - **Monthly** — month-over-month synthesis with hours/test-score deltas, subject balance, mastery growth, consistency streaks, next-month focus.
  - **Test brief** — surfaces on each `/tests` upcoming card within 7 days. Cross-references the student's per-topic status / confidence / mistakes with the test syllabus to produce a day-by-day revision plan.
- **Dashboard** — Executive Summary hero (this week's tracked hours vs plan, consistency, open red alerts, next test countdown, subject mastery), Planned vs Actual strip, top-3 alerts (severity-ordered), Father's notes feed, 7-day stacked hours chart with evidence-photo overlay, syllabus mastery radial, test-score trend (30d), today's reflection, upcoming tests, open doubts.

## Who can do what

PIN-gated, three roles. No user table, no password reset, no audit log — it's three people in a house. Server actions enforce these via `requireRole`; the UI hides buttons via `can(role, action)` from `src/lib/session.ts`.

| Action                            | Brother (student) | Father (guardian) | You (admin) |
| --------------------------------- | :---------------: | :---------------: | :---------: |
| View the dashboard                |        ✓          |        ✓          |      ✓      |
| Add / edit daily log + reflection |        ✓          |        —          |      ✓      |
| Upload evidence photos            |        ✓          |        —          |      ✓      |
| Use Smart Daily Log (AI parse)    |        ✓          |        —          |      ✓      |
| Update topic status / confidence  |        ✓          |        —          |      ✓      |
| Raise / delete / resolve doubts   |        ✓          |        —          |      ✓      |
| Ask AI for a doubt first-pass     |        ✓          |        ✓          |      ✓      |
| Log past test scores              |        ✓          |        —          |      ✓      |
| Schedule upcoming tests           |        ✓          |        —          |      ✓      |
| Generate AI test brief            |        ✓          |        ✓          |      ✓      |
| Create chapters                   |        ✓          |        —          |      ✓      |
| **View / acknowledge alerts**     |        —          |        ✓          |      ✓      |
| **Edit weekly plan**              |        —          |        ✓          |      ✓      |
| **Leave guardian comments**       |        —          |        ✓          |      ✓      |
| **View AI weekly / monthly**      |        —          |        ✓          |      ✓      |
| **Generate / email AI reports**   |        —          |        ✓          |      ✓      |
| Delete logs / tests / chapters / alerts / reports | — | — |      ✓      |
| Delete other people's comments    |        —          |        —          |      ✓      |

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (dark UI)
- Prisma ORM + SQLite (zero-config, file-based DB at `prisma/dev.db`)
- Recharts for visualisations
- Server Actions (no separate API layer) — except `/api/cron/*` and `/api/reports/[id]` (used by client components) and `/api/photos/[id]` (image bytes)
- Google `@google/generative-ai` SDK for all AI features
- Nodemailer for the report email path (optional)

## Run it

```bash
# 1. Install deps
npm install

# 2. Generate Prisma client, create the DB, seed the NCERT syllabus
npm run setup

# 3. Configure .env (see below)

# 4. Start the dev server
npm run dev
# open http://localhost:3000  →  redirects to /unlock
```

For a production-style run:

```bash
npm run build && npm start
```

Useful one-offs:

```bash
npm run typecheck   # tsc --noEmit, fast feedback
npm run lint        # next lint
npm run check       # typecheck + lint, what you should run before pushing
npm run db:studio   # Prisma Studio against dev.db
```

### .env

```
DATABASE_URL="file:./dev.db"

# Required: signs the role cookie. Any random string ≥ 16 chars.
APP_SECRET="<long random string, at least 32 chars>"

# Per-role PINs. Set whatever you want — they're shared secrets between
# the people in your house. Restart the dev server after changing.
PIN_STUDENT="1234"
PIN_GUARDIAN="2345"
PIN_ADMIN="3456"

# --- AI (Google Gemini) ----------------------------------------------------
# Get a key at https://aistudio.google.com/app/apikey
GEMINI_API_KEY=""
# Free-tier friendly default. Other valid choices in 2026:
#   gemini-2.5-flash       (default — best quality, ~10 req/min, 250 req/day)
#   gemini-2.5-flash-lite  (faster + more headroom, slightly weaker)
#   gemini-flash-latest    (alias)
# Note: gemini-1.5-flash is retired; gemini-2.0-flash returns "limit: 0"
# on free tier in many projects.
GEMINI_MODEL="gemini-2.5-flash"

# --- Email delivery (optional) --------------------------------------------
# If unset, generated reports still save and are viewable in /reports,
# but no email is sent. For Gmail: create an "App password" for SMTP_PASS.
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER=""
SMTP_PASS=""
REPORT_EMAIL_FROM=""
REPORT_EMAIL_TO=""

# --- Cron protection -------------------------------------------------------
# Any random string ≥ 16 chars. Required header value on POST /api/cron/*.
# Example:
#   curl -X POST -H "x-cron-secret: $CRON_SECRET" \
#     http://localhost:3000/api/cron/weekly-report
CRON_SECRET="change-me-to-any-random-string"
```

A role with no PIN configured (i.e. the env var is missing or empty) is
disabled on `/unlock` — useful if you don't want to give your brother access
yet. The session cookie lasts 30 days; click the lock icon in the top bar to
sign out manually.

If `GEMINI_API_KEY` is missing, every AI feature degrades gracefully: the
buttons either don't appear or surface a clear "set GEMINI_API_KEY" hint
instead of throwing. Same for email — without SMTP config, reports save but
the "Email" button returns a clean "Email is not configured" message.

## Scheduling the cron routes

The three AI report routes are stateless POSTs gated by `CRON_SECRET`:

| Route                              | When to call           | What it does |
| ---------------------------------- | ---------------------- | ------------ |
| `POST /api/cron/weekly-report`     | Sundays around 8pm IST | Generate + email last week's report |
| `POST /api/cron/monthly-report`    | 1st of every month     | Generate + email last month's review |
| `POST /api/cron/test-briefs`       | Daily                  | Refresh briefs for every upcoming test within 7 days |

Anything that can fire an HTTPS request on a schedule works (Vercel Cron,
GitHub Actions, a cron job on the same machine, Cloudflare Workers, etc.).
Auth is `x-cron-secret: <your CRON_SECRET>`. A missing or wrong secret
returns 401/403; a missing env var returns 500 (so retry-respecting
schedulers don't keep hammering a misconfigured deployment).

## Sharing the dashboard with your father

Two easy options:

1. **Same Wi-Fi** — `npm run dev -- -H 0.0.0.0`, then your father opens `http://<your-mac-ip>:3000` on his phone/laptop.
2. **Always-on** — deploy to Vercel and switch `DATABASE_URL` to a hosted SQLite (Turso) or Postgres (Neon / Supabase). Only the `provider` in `prisma/schema.prisma` needs to change.

## Suggested routines

**Brother (daily)**
1. **Every night, 60 seconds** — open `/daily/new`, paste one line of what you did into Smart Daily Log, hit Parse, confirm. Snap a photo of your notebook. Save.
2. **As tests are announced** — `/tests/upcoming/new`, fill date + chapters covered. The AI focus brief appears automatically once you're within 7 days.
3. **After every test** — `/tests`, click "Log scores" on the matching card, fill subject-wise breakdown and weak topics.
4. **As doubts arise** — drop them at `/doubts` from your phone. Hit "Ask AI" for an immediate first-pass; resolve once a teacher confirms or once the AI answer was enough.
5. **As you finish topics** — bump status on `/subjects`. This is what the syllabus mastery panel and the weekly report read from.

**Father (twice a week)**
1. **Mid-week, 2 min** — open `/`, scan the Executive Summary and the Alerts panel. Acknowledge anything you've already discussed with him. Leave a note in "Father's notes" if anything stands out.
2. **Sunday, 5 min** — `/plan` for the coming week. Set the per-subject hours, the test target, and a sentence of focus. Then open `/reports` and read the weekly AI report (or wait for the email).

**You / Admin (weekly)**
1. **Sunday review** — flush resolved alerts on `/alerts` if the list is getting long. Make sure the syllabus is current. Audit any suspicious edits.

## Data model (high level)

```
Student (1)
  └── implicit owner of everything

Subject (3) ── Chapter (n) ── Topic (n)            # syllabus spine
                       └── status, confidence, problems, mistakes

DailyLog (1 per date)                              # editable; admin-only delete
  ├── DailyEntry (n)        # one per (subject, source, chapter) studied that day
  ├── DailyReflection (0..1) # learned / confused / hardestSolved
  └── Photo (n)             # notebook / solved-problem evidence
  plus: sleepHours, energy (1-5)

StudyPlan (1 per week, Mon-Sun)                    # father's contract
  └── StudyPlanSubject (per subject + hoursGoal)
  plus: totalHoursGoal, testsGoal, revisionSessionsGoal, notes

Alert + AlertDismissal                             # rules-engine output
  kind, severity (red|warn|info), dedupeKey,
  title, body, suggestion, payload (JSON),
  acknowledgedAt, acknowledgedBy, resolvedAt

GuardianComment                                    # father's notes
  scope (general|day|test|subject|chapter),
  scopeId, scopeDate, authorRole, body

Test (past)        └── TestScore (per subject)
UpcomingTest       └── UpcomingTestSubject (per subject + chapters)
Doubt              # raised, optionally resolved, optional AI first-pass
Homework           # pending list

AiReport                                           # Gemini output cache
  kind (weekly|monthly|test_brief), scopeKey,      # unique (kind, scopeKey)
  title, body, metadata, model, tokensIn/Out,
  generatedAt, emailedAt, emailedTo
```

See `prisma/schema.prisma` for the full schema, including indexes on the hot
foreign keys and the dashboard's frequent filter columns.

## The rules engine

14 deterministic rules run on every dashboard render (`src/lib/rules.ts`).
No LLMs, no probabilistic models — when an alert fires, you can explain
exactly why, which is the whole point of not using AI for parental
accountability.

| Rule                  | Triggers when…                                                              | Severity     |
| --------------------- | --------------------------------------------------------------------------- | ------------ |
| `no_recent_study`     | No daily-log row for a subject in 5+ days                                   | warn → red @10d |
| `test_declining`      | Last 3 tests monotonically down, ≥8pp total drop, latest < 75%              | warn → red @15pp or <50% |
| `stale_doubts`        | Open doubts unresolved for 7+ days                                          | warn → red @5+ or 14d+ |
| `low_sleep_streak`    | 3+ consecutive days of sleep < 6h (where logged)                            | warn → red @5d |
| `burnout_precursor`   | Day with 8h+ study AND <6h sleep, in last 3 days                            | warn → red @2 |
| `low_energy_streak`   | 3+ consecutive days with energy rated ≤ 2                                   | warn → red @5d |
| `homework_backlog`    | 5+ pending homework items or 2+ overdue                                     | warn → red @10 or 4 overdue |
| `log_gap`             | No daily log for today AND yesterday                                        | warn → red @4d |
| `plan_behind`         | Tracked < 70% of plan pro-rated by days elapsed (after day 3 of week)       | warn → red @<40% |
| `low_daily_evidence`  | No notebook photos for 3 days in a row                                      | warn         |
| `log_without_evidence`| Today logged study but no photos attached                                   | warn         |
| `ritual_incomplete`   | Today's log is missing a photo and/or a real chapter+topic row              | warn         |
| `weak_reflection`     | 3 of the last 5 logs have blank reflection                                  | info         |
| `weekend_log_slip`    | It's Sat/Sun and the recent weekend days are unlogged                       | info         |

Each alert is keyed by a stable `dedupeKey` (e.g. `no_recent_study:<subjectId>`).
If the same condition continues, the alert is updated in place — father's
acknowledgement persists. When the condition stops, the alert is marked
resolved. If it re-triggers later, acknowledgement is cleared so father sees
the fresh occurrence in his queue. Admin can permanently dismiss a kind via
`AlertDismissal`, which suppresses re-creation forever (or until you delete
the dismissal row).

## How the AI features are wired

Every AI call goes through `src/lib/ai/gemini.ts`, which:

- Reads `GEMINI_API_KEY` from env (clear `GeminiNotConfiguredError` if missing)
- Reads `GEMINI_MODEL` (defaults to `gemini-2.5-flash`)
- Enforces a 45-second hard timeout per call so cron jobs and server actions can't hang
- Retries 429 rate-limits with exponential backoff that honours the server-supplied `retryDelay`
- Translates "model unavailable" (404 or `limit: 0`) into a one-line hint telling you which models *are* valid for your project

The five AI surfaces live in `src/lib/ai/*.ts`:

- `weeklyReport.ts` — gathers one week of data into a snapshot, asks Gemini for a 200-word father-friendly narrative, caches as `AiReport(kind=weekly, scopeKey=YYYY-MM-DD)`
- `monthlyReport.ts` — same shape, month-over-month, with previous-month deltas baked into the prompt
- `testBrief.ts` — cross-references the student's per-topic state with the upcoming test syllabus, asks for a day-by-day plan
- `parseLog.ts` — Gemini JSON mode with a strict `responseSchema`, returns structured fields the Daily Log form pre-fills
- `doubt.ts` — first-pass doubt answer with an explicit "say so if you're not confident" instruction, stored on the `Doubt` row with a `aiConfident` flag the UI surfaces
