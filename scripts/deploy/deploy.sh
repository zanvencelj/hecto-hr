#!/usr/bin/env bash
# Ships docker-compose.prod.yml + the config it needs to the VPS, then pulls
# and (re)starts the stack there. Run locally, after build-and-push.sh.
#
# Usage:
#   scripts/deploy/deploy.sh <user@host>
#   DEPLOY_DIR=/opt/hectohr IMAGE_TAG=abc1234 scripts/deploy/deploy.sh root@hectohr.com
#
# Prerequisites on the server (one-time, see docs/deployment.md):
#   - Docker + the Compose plugin installed
#   - DNS A records for hectohr.com, www, app, admin, files already pointing here
#   - .env.production does NOT need to pre-exist remotely — this script copies
#     the local one (fill it in first: cp .env.production.example .env.production
#     && scripts/deploy/generate-secrets.sh)
set -euo pipefail

DEPLOY_HOST="${1:-${DEPLOY_HOST:-}}"
if [ -z "$DEPLOY_HOST" ]; then
  echo "usage: scripts/deploy/deploy.sh <user@host>" >&2
  exit 1
fi

DEPLOY_DIR="${DEPLOY_DIR:-/opt/hectohr}"
ENV_FILE="${ENV_FILE:-.env.production}"

cd "$(git rev-parse --show-toplevel)"

if [ ! -f "$ENV_FILE" ]; then
  echo "error: $ENV_FILE not found — cp .env.production.example $ENV_FILE and fill it in first" >&2
  exit 1
fi

echo "==> Creating $DEPLOY_DIR on $DEPLOY_HOST"
ssh "$DEPLOY_HOST" "mkdir -p $DEPLOY_DIR/monitoring $DEPLOY_DIR/scripts/backup $DEPLOY_DIR/libs/backend/database/scripts"

echo "==> Syncing compose file + env + backup/monitoring config"
rsync -az docker-compose.prod.yml "$DEPLOY_HOST:$DEPLOY_DIR/docker-compose.prod.yml"
rsync -az "$ENV_FILE" "$DEPLOY_HOST:$DEPLOY_DIR/.env.production"
rsync -az monitoring/ "$DEPLOY_HOST:$DEPLOY_DIR/monitoring/"
rsync -az scripts/backup/ "$DEPLOY_HOST:$DEPLOY_DIR/scripts/backup/"
rsync -az libs/backend/database/scripts/backup.sh "$DEPLOY_HOST:$DEPLOY_DIR/libs/backend/database/scripts/backup.sh"

IMAGE_TAG="${IMAGE_TAG:-latest}"
echo "==> Pulling images (tag: $IMAGE_TAG) and starting the stack"
# shellcheck disable=SC2029
ssh "$DEPLOY_HOST" "cd $DEPLOY_DIR && \
  IMAGE_TAG=$IMAGE_TAG docker compose -f docker-compose.prod.yml --env-file .env.production pull && \
  IMAGE_TAG=$IMAGE_TAG docker compose -f docker-compose.prod.yml --env-file .env.production up -d --remove-orphans"

echo "==> Waiting for the backend health check..."
ssh "$DEPLOY_HOST" "cd $DEPLOY_DIR && timeout 60 sh -c 'until docker compose -f docker-compose.prod.yml ps backend --format \"{{.Health}}\" | grep -q healthy; do sleep 2; done'" \
  && echo "==> backend is healthy" \
  || echo "==> backend did not report healthy within 60s — check: ssh $DEPLOY_HOST 'cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml logs backend'"

cat <<EOF

==> Deployed. Next steps if this is a first-time deploy:
    ssh $DEPLOY_HOST 'cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml --env-file .env.production run --rm seed'
    ssh $DEPLOY_HOST 'cd $DEPLOY_DIR && docker compose -f docker-compose.prod.yml --env-file .env.production run --rm superadmin-create <email> <password>'
EOF
