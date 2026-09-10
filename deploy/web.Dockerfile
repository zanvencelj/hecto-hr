# Builds the three static frontends (landing, manager, admin) and serves them,
# plus the /api reverse proxy, from a single Caddy container. Run from the repo
# root: docker build -f deploy/web.Dockerfile -t hectohr-web .
#
# Unlike apps/backend/Dockerfile, this doesn't bother with selective
# package.json copying for layer-cache optimization — this image only rebuilds
# on deploy, not on every backend code change, so a full `pnpm install` is fine.

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

# manager and admin call the API via a same-origin relative `/api` path
# (proxied by Caddy, see deploy/Caddyfile) so they need no build-time API URL.
# landing only needs absolute URLs for its plain <a> links to the other apps.
FROM deps AS builder
ARG VITE_MANAGER_URL=https://app.hectohr.com
ARG VITE_ADMIN_URL=https://admin.hectohr.com
ENV VITE_MANAGER_URL=$VITE_MANAGER_URL
ENV VITE_ADMIN_URL=$VITE_ADMIN_URL
RUN pnpm nx run landing:build && \
    pnpm nx run @hecto/manager:build && \
    pnpm nx run admin-app:build

FROM caddy:2-alpine AS runner
COPY --from=builder /app/apps/landing/dist /srv/landing
COPY --from=builder /app/apps/manager/dist /srv/manager
COPY --from=builder /app/apps/admin/dist /srv/admin
COPY deploy/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
