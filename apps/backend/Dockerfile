FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ---- deps stage ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json apps/backend/package.json
# onlyBuiltDependencies in package.json controls which scripts run (native binaries, etc.)
RUN pnpm install --frozen-lockfile

# ---- builder stage ----
FROM base AS builder
WORKDIR /app
# Copy both root and workspace node_modules to preserve pnpm's peer-dep symlink structure
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY . .
# nx sync reconciles TypeScript project references (required in non-interactive/CI envs)
# nx run backend:prune: builds the app, then generates a pruned lockfile + copies workspace modules
RUN pnpm nx sync && \
    pnpm nx run backend:prune && \
    mkdir -p apps/backend/dist/workspace_modules apps/backend/dist/assets

# ---- runner stage ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Install only the production runtime deps from the pruned lockfile
COPY --from=builder /app/apps/backend/dist/package.json ./package.json
COPY --from=builder /app/apps/backend/dist/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile --prod --ignore-scripts
# Overlay any local workspace packages the backend depends on
COPY --from=builder /app/apps/backend/dist/workspace_modules ./node_modules/
# Copy the built app and static assets
COPY --from=builder /app/apps/backend/dist/main.js ./main.js
COPY --from=builder /app/apps/backend/dist/assets ./assets
EXPOSE 3000
CMD ["node", "main.js"]
