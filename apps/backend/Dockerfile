FROM node:22-alpine AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Pin the exact pnpm version from the root package.json (not just `corepack
# enable`, which lets a bare `pnpm` resolve to latest) — the runner stage only
# copies the pruned apps/backend/dist/package.json, which has no
# packageManager field of its own, so without this it silently drifts to
# whatever pnpm is newest and produces a lockfile the frozen install rejects.
COPY package.json ./
RUN corepack enable && corepack prepare "$(node -p "require('./package.json').packageManager")" --activate

# ---- deps stage ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY patches ./patches
COPY apps/backend/package.json apps/backend/package.json
COPY libs/backend/auth/package.json libs/backend/auth/package.json
COPY libs/backend/database/package.json libs/backend/database/package.json
COPY libs/backend/mail/package.json libs/backend/mail/package.json
COPY libs/backend/queue/package.json libs/backend/queue/package.json
COPY libs/backend/storage/package.json libs/backend/storage/package.json
COPY libs/backend/users/package.json libs/backend/users/package.json
COPY libs/shared/types/package.json libs/shared/types/package.json
# onlyBuiltDependencies in package.json controls which scripts run (native binaries, etc.)
RUN pnpm install --frozen-lockfile

# ---- builder stage ----
FROM base AS builder
WORKDIR /app
# Copy both root and workspace node_modules to preserve pnpm's peer-dep symlink structure
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps /app/libs/backend/database/node_modules ./libs/backend/database/node_modules
COPY --from=deps /app/libs/shared/types/node_modules ./libs/shared/types/node_modules
COPY . .
# nx sync reconciles TypeScript project references (required in non-interactive/CI envs)
# backend:prune builds main.js (clean: true), generates pruned lockfile + copies workspace modules
# build-worker/build-seed/build-create-superadmin run after so they're added without clobbering main.js
RUN pnpm nx sync && \
    pnpm nx run backend:prune && \
    pnpm nx run backend:build-worker && \
    pnpm nx run backend:build-seed && \
    pnpm nx run backend:build-create-superadmin && \
    mkdir -p apps/backend/dist/workspace_modules apps/backend/dist/assets

# ---- migrator stage (used by docker-compose.prod.yml migrate service) ----
FROM deps AS migrator
# Version-matched to the postgres:17-alpine server image so pg_dump/pg_restore stay compatible
RUN apk add --no-cache postgresql17-client
WORKDIR /app
COPY drizzle.config.ts ./
COPY libs/backend/database/migrations ./libs/backend/database/migrations
COPY libs/backend/database/scripts ./libs/backend/database/scripts
RUN chmod +x libs/backend/database/scripts/*.sh
CMD ["libs/backend/database/scripts/migrate-entrypoint.sh"]

# ---- runner stage ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Install only the production runtime deps from the pruned lockfile
COPY --from=builder /app/apps/backend/dist/package.json ./package.json
COPY --from=builder /app/apps/backend/dist/pnpm-lock.yaml ./pnpm-lock.yaml
# @nx/js:prune-lockfile carries the root's top-level `patchedDependencies`
# block (react-native-css-interop, for the Expo apps) into the pruned lockfile
# even though the pruned package.json has no pnpm.patchedDependencies of its
# own — backend depends on none of it. That mismatch fails the frozen
# install below, so strip the now-orphaned block first.
RUN awk '/^patchedDependencies:/{skip=1;next} skip&&/^[^[:space:]]/{skip=0} !skip' \
      pnpm-lock.yaml > pnpm-lock.yaml.tmp && mv pnpm-lock.yaml.tmp pnpm-lock.yaml
RUN pnpm install --frozen-lockfile --prod --ignore-scripts && \
    # pnpm creates symlinks for workspace:* packages; remove them so the
    # compiled workspace modules copied below can replace them cleanly
    rm -rf node_modules/@hecto
# Overlay compiled workspace packages (replaces the symlinks removed above)
COPY --from=builder /app/apps/backend/dist/workspace_modules ./node_modules/
# Copy all entry points — docker-compose selects which to run per service
COPY --from=builder /app/apps/backend/dist/main.js ./main.js
COPY --from=builder /app/apps/backend/dist/worker.js ./worker.js
COPY --from=builder /app/apps/backend/dist/seed.js ./seed.js
COPY --from=builder /app/apps/backend/dist/create-superadmin.js ./create-superadmin.js
COPY --from=builder /app/apps/backend/dist/assets ./assets
EXPOSE 3000
CMD ["node", "main.js"]
