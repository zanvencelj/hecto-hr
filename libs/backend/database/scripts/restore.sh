#!/bin/sh
# Last-resort recovery: restores a pg_dump taken by backup.sh.
# Usage: restore.sh [path-to-dump]   (defaults to the most recent backup)
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "restore.sh: DATABASE_URL is not set" >&2
  exit 1
fi

dump="${1:-}"
if [ -z "$dump" ]; then
  dump=$(find "$BACKUP_DIR" -maxdepth 1 -name 'hectohr_*.dump' | sort | tail -n 1)
fi

if [ -z "$dump" ] || [ ! -f "$dump" ]; then
  echo "restore.sh: no backup file found (looked in $BACKUP_DIR)" >&2
  exit 1
fi

echo "restore.sh: about to restore $dump onto $DATABASE_URL"
echo "restore.sh: this drops and recreates conflicting objects. Type the backup filename to confirm:"
printf '> '
read -r confirm
if [ "$confirm" != "$(basename "$dump")" ]; then
  echo "restore.sh: confirmation did not match, aborting" >&2
  exit 1
fi

pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" "$dump"
echo "restore.sh: restore complete"
