#!/bin/sh
# CI guard: fails if drizzle-kit generate would produce a migration/snapshot
# change that isn't committed. Catches hand-written migrations that silently
# fall out of sync with the snapshot chain (the root cause of a real prod-blocking bug).
set -eu

pnpm db:generate

if [ -n "$(git status --porcelain -- libs/backend/database/migrations)" ]; then
  echo "Migrations are out of sync with schema.ts." >&2
  echo "Run 'pnpm db:generate' locally and commit the result:" >&2
  git status --porcelain -- libs/backend/database/migrations >&2
  exit 1
fi

echo "check-drift.sh: migrations are in sync with schema.ts"
