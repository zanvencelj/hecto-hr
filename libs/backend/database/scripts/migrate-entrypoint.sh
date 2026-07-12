#!/bin/sh
# Prod migrate service entrypoint: backup, then migrate. Backup failure aborts
# the migration rather than proceeding unprotected.
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

"$SCRIPT_DIR/backup.sh"
pnpm db:migrate
