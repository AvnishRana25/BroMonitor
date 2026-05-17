#!/usr/bin/env bash
# Apply Prisma schema + NCERT seed to the database pointed at by DATABASE_URL.
# Usage (production):
#   npx vercel env pull .env.vercel.production --environment=production
#   set -a && source .env.vercel.production && set +a
#   ./scripts/vercel-prod-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set."
  echo "Pull Vercel env first:"
  echo "  npx vercel env pull .env.vercel.production --environment=production"
  echo "  set -a && source .env.vercel.production && set +a"
  exit 1
fi

if [[ -z "${DIRECT_DATABASE_URL:-}" ]]; then
  echo "WARN: DIRECT_DATABASE_URL unset; using DATABASE_URL for migrations."
  export DIRECT_DATABASE_URL="$DATABASE_URL"
fi

echo "→ prisma db push"
npx prisma db push

echo "→ npm run db:seed"
npm run db:seed

echo "Done. Schema synced and syllabus seeded."
