#!/bin/sh
# Takes a timestamped pg_dump before migrations run, keeps the last N.
# Runs inside the migrator container; DATABASE_URL and BACKUP_DIR come from env.
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_RETENTION="${BACKUP_RETENTION:-10}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "backup.sh: DATABASE_URL is not set" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

stamp=$(date -u +%Y%m%dT%H%M%SZ)
dest="$BACKUP_DIR/hectohr_${stamp}.dump"

echo "backup.sh: dumping database to $dest"
pg_dump "$DATABASE_URL" -F c -f "$dest"

# Prune anything past the retention count, oldest first.
count=$(find "$BACKUP_DIR" -maxdepth 1 -name 'hectohr_*.dump' | wc -l)
if [ "$count" -gt "$BACKUP_RETENTION" ]; then
  find "$BACKUP_DIR" -maxdepth 1 -name 'hectohr_*.dump' | sort | head -n "$((count - BACKUP_RETENTION))" | while IFS= read -r stale; do
    echo "backup.sh: pruning old backup $stale"
    rm -f "$stale"
  done
fi

echo "backup.sh: done"
