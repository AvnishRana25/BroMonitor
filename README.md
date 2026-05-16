# BroMonitor

A guardian dashboard to track a class 11 student's daily school + coaching progress. Built for you and your father — not the student.

## What it tracks

- **Daily log** — school / coaching / self-study hours, NCERT chapter studied (per subject + source), optional sub-topic, problems solved, homework done, free-form notes. Logs are editable and deletable.
- **Subjects** — full NCERT Class 11 syllabus seeded for Physics (14 chapters), Chemistry (9 chapters), Maths (14 chapters). Each chapter has its standard topic list. Mark each topic with a status (not started → class taught → self studied → problems done → revised → mastered), confidence (1–5), problems solved, mistakes made.
- **Tests** — log past tests with subject-wise breakdown (marks / max / correct / wrong / unattempted / weak topics), rank, percentile, notes. Schedule **upcoming tests** with date, type, max marks, duration, subject + chapter syllabus, prep plan.
- **Doubts** — open-doubt queue with raised date, resolved date, and who resolved it (teacher / peer / self / online).
- **Dashboard** — today's hours, 7-day trend, syllabus mastery per subject, test-score trend over the last 30 days, upcoming tests with countdown, open doubts, pending homework, today's entries.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (dark UI)
- Prisma ORM + SQLite (zero-config, file-based DB at `prisma/dev.db`)
- Recharts for visualisations
- Server Actions (no separate API layer)

## Run it

```bash
# 1. Install deps
npm install

# 2. Generate Prisma client, create the DB, seed the NCERT syllabus
npm run setup

# 3. Start the dev server
npm run dev
# open http://localhost:3000
```

For a production-style run:

```bash
npm run build && npm start
```

## Sharing the dashboard with your father

Two easy options:

1. **Same Wi-Fi** — `npm run dev -- -H 0.0.0.0`, then your father opens `http://<your-mac-ip>:3000` on his phone/laptop.
2. **Always-on** — deploy to Vercel and switch `DATABASE_URL` to a hosted SQLite (Turso) or Postgres (Neon / Supabase). Only `provider` in `prisma/schema.prisma` needs to change.

## Suggested daily routine

1. **Every night, 5 min** — open `/daily/new`, log hours + chapters covered. Tick off any topic on `/subjects` that crossed a milestone.
2. **When a test is announced** — `/tests/upcoming/new`, fill in date + chapters covered + prep plan. It shows up on the dashboard with a countdown.
3. **After every test** — open the upcoming card, click "Log scores", fill subject-wise breakdown and weak topics.
4. **As doubts arise** — drop them at `/doubts` from your phone. Resolve when answered.
5. **Sunday review** — open `/` (dashboard): weekly hours chart, mastery %, test trend, upcoming tests. Flag anything red.

## Data model (high level)

```
Student (1)
  └── implicit owner of everything

Subject (3) ── Chapter (n) ── Topic (n)            # syllabus spine
                       └── status, confidence, problems, mistakes

DailyLog (1 per date)                              # editable + deletable
  └── DailyEntry (n)   # one per (subject, source, chapter) studied that day

Test (past)
  └── TestScore (per subject)

UpcomingTest (scheduled)                           # date, type, max marks, duration
  └── UpcomingTestSubject (per subject + chapters)

Doubt    # raised, optionally resolved
Homework # pending list
```

See `prisma/schema.prisma` for the full schema.
