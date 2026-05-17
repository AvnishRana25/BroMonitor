/**
 * One-shot data migration: dev.db (SQLite) → Postgres (Neon / Vercel Postgres).
 *
 * Usage:
 *   1) Set DATABASE_URL in .env to your Neon Postgres connection string
 *      (or set POSTGRES_URL inline before running).
 *   2) Make sure the Postgres database schema is already pushed:
 *          npx prisma migrate deploy   (or: npx prisma db push)
 *   3) Run:
 *          npx tsx scripts/migrate-sqlite-to-postgres.ts
 *
 * What it does:
 *   - Opens `prisma/dev.db` directly with the `sqlite3` package (read-only).
 *   - For every model, reads every row and bulk-inserts it into Postgres via
 *     Prisma, preserving primary keys and createdAt/updatedAt values.
 *   - Inserts are done parent → child so foreign keys are satisfied.
 *   - Skips rows whose ids already exist on the target (so re-running is safe).
 *
 * Local photos (in `uploads/`) are NOT uploaded to Cloudinary by this script —
 * the photo metadata is copied so old rows remain pointing at the legacy
 * filename column. New uploads go straight to Cloudinary. If you want to
 * back-fill those, run `tsx scripts/backfill-photos-to-cloudinary.ts` (TBD).
 */

import path from "node:path";
import fs from "node:fs";
import sqlite3pkg from "sqlite3";
import { PrismaClient } from "@prisma/client";

const sqlite3 = sqlite3pkg.verbose();

const SQLITE_PATH = process.env.SQLITE_PATH
  ? path.resolve(process.env.SQLITE_PATH)
  : path.resolve(process.cwd(), "prisma/dev.db");

if (!fs.existsSync(SQLITE_PATH)) {
  console.error(`✖ SQLite file not found at ${SQLITE_PATH}`);
  process.exit(1);
}
if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  console.error(
    "✖ DATABASE_URL must be a postgres:// URL before running this migration.",
  );
  process.exit(1);
}

const pg = new PrismaClient();
const sq = new sqlite3.Database(SQLITE_PATH, sqlite3.OPEN_READONLY);

function all<T = Record<string, unknown>>(query: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    sq.all(query, (err, rows) => (err ? reject(err) : resolve(rows as T[])));
  });
}

// SQLite stores DateTime as ISO strings *or* unix-millis Ints (depending on
// how Prisma persisted them). Boolean is 0/1. This normalises to the native
// JS types Postgres / Prisma expect on the target side.
//
// Any column whose name ends in `At` or equals `date` / `dueAt` / etc. and
// holds a plausible millis integer is treated as a date — that's the heuristic
// Prisma itself uses on the SQLite reader.
// Covers Prisma datetime conventions in this codebase: *At, *Date, *Start,
// *End, *Until, plus the bare `date` and `dueAt` style columns.
const DATE_COL_RE = /(At|Date|Start|End|Until)$|^date$/i;
const PLAUSIBLE_EPOCH_MS_MIN = 946684800000; // 2000-01-01
const PLAUSIBLE_EPOCH_MS_MAX = 4102444800000; // 2100-01-01

function coerce(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v == null) {
      out[k] = null;
    } else if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
      out[k] = new Date(v);
    } else if (
      typeof v === "number" &&
      DATE_COL_RE.test(k) &&
      v >= PLAUSIBLE_EPOCH_MS_MIN &&
      v <= PLAUSIBLE_EPOCH_MS_MAX
    ) {
      out[k] = new Date(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function coerceBools(
  row: Record<string, unknown>,
  fields: string[],
): Record<string, unknown> {
  for (const f of fields) {
    if (row[f] != null) row[f] = !!row[f];
  }
  return row;
}

async function migrateTable<T extends { id?: string }>(opts: {
  tableName: string;
  prismaModel: string;
  boolFields?: string[];
  // Optional skip predicate (e.g. skip rows where required relation is missing)
  skipIf?: (row: Record<string, unknown>) => boolean;
  // Optional row transform after coerce
  transform?: (row: Record<string, unknown>) => Record<string, unknown>;
}) {
  const { tableName, prismaModel, boolFields = [], skipIf, transform } = opts;
  const rows = await all(`SELECT * FROM "${tableName}"`);
  if (rows.length === 0) {
    console.log(`· ${tableName}: 0 rows`);
    return;
  }

  // Use the dynamic accessor so we don't have to enumerate every model name.
  const model = (pg as unknown as Record<string, { createMany: Function }>)[
    prismaModel
  ];
  if (!model || typeof model.createMany !== "function") {
    throw new Error(`No prisma model named "${prismaModel}"`);
  }

  const cooked = rows
    .map((r) => coerce(r as Record<string, unknown>))
    .map((r) => coerceBools(r, boolFields))
    .map((r) => (transform ? transform(r) : r))
    .filter((r) => !skipIf?.(r));

  const res = await model.createMany({ data: cooked, skipDuplicates: true });
  console.log(`✓ ${tableName} → ${prismaModel}: ${res.count}/${cooked.length}`);
}

async function main() {
  console.log(`Reading from ${SQLITE_PATH}`);
  console.log(`Writing to ${process.env.DATABASE_URL!.split("@")[1] ?? "postgres"}`);

  // Parents first, children after. Anything optional (Doubt.imageUrl etc.)
  // simply stays null on rows that didn't have the column.
  await migrateTable({ tableName: "Student", prismaModel: "student" });
  await migrateTable({ tableName: "Subject", prismaModel: "subject" });
  await migrateTable({ tableName: "Chapter", prismaModel: "chapter" });
  await migrateTable({ tableName: "Topic", prismaModel: "topic" });

  await migrateTable({ tableName: "DailyLog", prismaModel: "dailyLog" });
  await migrateTable({
    tableName: "DailyEntry",
    prismaModel: "dailyEntry",
    boolFields: ["homeworkDone"],
  });
  await migrateTable({
    tableName: "DailyReflection",
    prismaModel: "dailyReflection",
  });
  await migrateTable({ tableName: "Photo", prismaModel: "photo" });

  await migrateTable({ tableName: "StudyPlan", prismaModel: "studyPlan" });
  await migrateTable({
    tableName: "StudyPlanSubject",
    prismaModel: "studyPlanSubject",
  });
  await migrateTable({ tableName: "GuardianComment", prismaModel: "guardianComment" });

  await migrateTable({ tableName: "Alert", prismaModel: "alert" });
  await migrateTable({ tableName: "AlertDismissal", prismaModel: "alertDismissal" });

  await migrateTable({ tableName: "AiReport", prismaModel: "aiReport" });

  await migrateTable({ tableName: "Test", prismaModel: "test" });
  await migrateTable({ tableName: "TestScore", prismaModel: "testScore" });
  await migrateTable({ tableName: "UpcomingTest", prismaModel: "upcomingTest" });
  await migrateTable({
    tableName: "UpcomingTestSubject",
    prismaModel: "upcomingTestSubject",
  });

  await migrateTable({
    tableName: "Doubt",
    prismaModel: "doubt",
    boolFields: ["aiConfident"],
  });
  await migrateTable({ tableName: "Homework", prismaModel: "homework" });

  console.log("\nAll tables copied. Source SQLite was opened read-only — your dev.db is untouched.");
}

main()
  .catch((e) => {
    console.error("\n✖ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    sq.close();
    await pg.$disconnect();
  });
