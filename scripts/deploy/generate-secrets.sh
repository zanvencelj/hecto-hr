#!/bin/sh
# Fills in every `KEY=[GENERATE]` placeholder in an env file with a random
# 64-char hex secret. Idempotent — already-filled values are left untouched,
# so re-running after hand-editing SMTP/domain values is safe.
#
# Usage: scripts/deploy/generate-secrets.sh [path-to-env-file]   (default: .env.production)
set -eu

ENV_FILE="${1:-.env.production}"

if [ ! -f "$ENV_FILE" ]; then
  echo "generate-secrets.sh: $ENV_FILE not found (copy .env.production.example first)" >&2
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "generate-secrets.sh: openssl is required" >&2
  exit 1
fi

count=0
while IFS= read -r key; do
  value=$(openssl rand -hex 32)
  # BSD sed (macOS) requires an argument to -i; GNU sed treats '' as no backup either way.
  sed -i.bak "s#^${key}=\[GENERATE\]#${key}=${value}#" "$ENV_FILE"
  rm -f "${ENV_FILE}.bak"
  count=$((count + 1))
done <<EOF
$(grep -oE '^[A-Z_]+=\[GENERATE\]' "$ENV_FILE" | cut -d= -f1)
EOF

echo "generate-secrets.sh: filled $count placeholder(s) in $ENV_FILE"

remaining=$(grep -cE '^[A-Z_]+=\[SET ME\]' "$ENV_FILE" || true)
if [ "$remaining" -gt 0 ]; then
  echo "generate-secrets.sh: $remaining value(s) still need manual input — search $ENV_FILE for '[SET ME]' (SMTP credentials)"
fi
