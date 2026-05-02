FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ---- deps stage ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
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
# build-worker runs after so worker.js is added without clobbering the main bundle
RUN pnpm nx sync && \
    pnpm nx run backend:prune && \
    pnpm nx run backend:build-worker && \
    mkdir -p apps/backend/dist/workspace_modules apps/backend/dist/assets

# ---- migrator stage (used by docker-compose.prod.yml migrate service) ----
FROM deps AS migrator
WORKDIR /app
COPY drizzle.config.ts ./
COPY libs/backend/database/migrations ./libs/backend/database/migrations
CMD ["pnpm", "db:migrate"]

# ---- runner stage ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Install only the production runtime deps from the pruned lockfile
COPY --from=builder /app/apps/backend/dist/package.json ./package.json
COPY --from=builder /app/apps/backend/dist/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile --prod --ignore-scripts && \
    # pnpm creates symlinks for workspace:* packages; remove them so the
    # compiled workspace modules copied below can replace them cleanly
    rm -rf node_modules/@hecto
# Overlay compiled workspace packages (replaces the symlinks removed above)
COPY --from=builder /app/apps/backend/dist/workspace_modules ./node_modules/
# Copy both entry points — docker-compose selects which to run per service
COPY --from=builder /app/apps/backend/dist/main.js ./main.js
COPY --from=builder /app/apps/backend/dist/worker.js ./worker.js
COPY --from=builder /app/apps/backend/dist/assets ./assets
EXPOSE 3000
CMD ["node", "main.js"]
