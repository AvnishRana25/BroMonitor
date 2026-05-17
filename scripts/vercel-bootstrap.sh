#!/usr/bin/env bash
# One-time production bootstrap after Vercel project + Postgres exist.
# Prereqs: `vercel login` and `vercel link` in this repo.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! vercel whoami &>/dev/null; then
  echo "Run: vercel login"
  exit 1
fi

if [[ ! -d .vercel ]]; then
  echo "Linking project (pick BroMonitor / create new)…"
  vercel link
fi

ENV_FILE=".env.vercel.production"
echo "Pulling production env → ${ENV_FILE}"
vercel env pull "$ENV_FILE" --environment=production --yes

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo ""
  echo "DATABASE_URL is missing on Vercel."
  echo "1. Vercel dashboard → Storage → Create Postgres → connect to this project"
  echo "2. Settings → Environment Variables:"
  echo "     DATABASE_URL = POSTGRES_URL (pooled)"
  echo "     DIRECT_DATABASE_URL = POSTGRES_URL_NON_POOLING"
  echo "3. Copy APP_SECRET, PIN_*, GEMINI_*, CLOUDINARY_*, CRON_SECRET, SMTP_* from local .env"
  echo "4. Redeploy, then re-run: ./scripts/vercel-bootstrap.sh"
  exit 1
fi

./scripts/vercel-prod-db.sh

echo ""
echo "Deploying production…"
vercel deploy --prod --yes

echo ""
echo "Bootstrap complete. Open your production URL and sign in at /unlock"
