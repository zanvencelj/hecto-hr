#!/bin/sh
# Entrypoint for the `backup` sidecar (docker-compose.prod.yml).
# Deploys already get a pre-migration backup via
# libs/backend/database/scripts/migrate-entrypoint.sh — that only protects
# deploy moments. This loop calls the *same* backup.sh nightly at BACKUP_HOUR
# UTC so data changed between deploys is covered too. Both write into the same
# $BACKUP_DIR pool under one retention policy (BACKUP_RETENTION, count-based).
set -eu

BACKUP_HOUR="${BACKUP_HOUR:-3}"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

seconds_until_next_run() {
  # Pure arithmetic (no `date -d` relative parsing) so this works with busybox date too.
  local now_sec target_sec diff
  now_sec=$((10#$(date -u +%H) * 3600 + 10#$(date -u +%M) * 60 + 10#$(date -u +%S)))
  target_sec=$((BACKUP_HOUR * 3600))
  diff=$(( (target_sec - now_sec + 86400) % 86400 ))
  [ "$diff" -eq 0 ] && diff=86400
  echo "$diff"
}

"$SCRIPT_DIR/backup.sh"

while true; do
  sleep "$(seconds_until_next_run)"
  "$SCRIPT_DIR/backup.sh"
done
