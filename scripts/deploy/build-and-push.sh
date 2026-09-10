#!/usr/bin/env bash
# Builds all three deploy images (backend, migrator, web) and pushes them to
# GHCR. Run locally from a full checkout — the server never builds anything,
# it only pulls what this script pushes (see docker-compose.prod.yml).
#
# Usage:
#   scripts/deploy/build-and-push.sh                # tags with git sha + latest
#   REGISTRY=ghcr.io/other-org scripts/deploy/build-and-push.sh
#
# Auth: needs a GHCR-scoped token (write:packages) in $GHCR_TOKEN, or falls
# back to `gh auth token` if the gh CLI is installed and logged in.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

REGISTRY="${REGISTRY:-ghcr.io/zanvencelj}"
SHA="$(git rev-parse --short HEAD)"
DIRTY=""
git diff --quiet || DIRTY="-dirty"
TAG="${IMAGE_TAG:-${SHA}${DIRTY}}"

echo "==> Registry: $REGISTRY   Tag: $TAG (+ latest)"

if [ -n "${GHCR_TOKEN:-}" ]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:-$(git config user.email)}" --password-stdin
elif command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  gh auth token | docker login ghcr.io -u "$(gh api user -q .login)" --password-stdin
else
  echo "error: no registry credentials — set GHCR_TOKEN (a GitHub PAT with write:packages)," >&2
  echo "       or install+login the gh CLI (gh auth login)." >&2
  exit 1
fi

build_and_push() {
  local name="$1" dockerfile="$2" target="${3:-}"
  local image="${REGISTRY}/hectohr-${name}"
  local target_args=()
  [ -n "$target" ] && target_args=(--target "$target")

  echo "==> Building ${image}:${TAG}"
  docker build -f "$dockerfile" "${target_args[@]}" \
    -t "${image}:${TAG}" -t "${image}:latest" .

  echo "==> Pushing ${image}:${TAG} and :latest"
  docker push "${image}:${TAG}"
  docker push "${image}:latest"
}

build_and_push backend apps/backend/Dockerfile runner
build_and_push migrator apps/backend/Dockerfile migrator
build_and_push web deploy/web.Dockerfile

cat <<EOF

==> Done. On the server:
    IMAGE_TAG=${TAG} scripts/deploy/deploy.sh <deploy-host>
  or, to just move an already-deployed server to this tag without re-running deploy.sh:
    ssh <deploy-host> 'cd /opt/hectohr && IMAGE_TAG=${TAG} docker compose -f docker-compose.prod.yml pull && IMAGE_TAG=${TAG} docker compose -f docker-compose.prod.yml up -d'
EOF
