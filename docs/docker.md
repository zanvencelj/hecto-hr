# Docker & Deployment

This guide covers the Docker Compose setup, containerization, and deployment strategies.

> Deploying to the actual hectohr.com VPS? See [`docs/deployment.md`](./deployment.md) for the
> domain/registry-specific walkthrough (Caddy, GHCR, `scripts/deploy/*.sh`, demo seeding). This
> doc stays generic — Dockerfile stages, compose mechanics, backups, monitoring.

## Overview

The project includes:
- **`apps/backend/Dockerfile`**: Multi-stage production build for both the NestJS backend and the BullMQ worker
- **`docker-compose.yml`**: Full local development environment (Postgres, Redis, Mailhog, backend, worker)
- **`.dockerignore`**: Excludes unnecessary files from build context

## Docker Compose: Local Development

### Services

`docker-compose.yml` defines five services:

| Service | Image | Port(s) | Purpose |
|---------|-------|---------|---------|
| `postgres` | `postgres:17-alpine` | 5432 | Primary database |
| `redis` | `redis:7-alpine` | 6379 | BullMQ job queue broker |
| `mailhog` | `mailhog/mailhog` | 1025 (SMTP), 8025 (UI) | Development email capture |
| `backend` | Built from Dockerfile | 3000 | NestJS HTTP server |
| `worker` | Built from Dockerfile | — | BullMQ job processor |

### Start All Services

```bash
mise run up
# or
docker compose up -d
```

This starts all five services in daemon mode. The backend and worker wait for Postgres and Redis to be healthy before starting.

### Stop All Services

```bash
mise run down
# or
docker compose down
```

### Start/Restart Individual Services

```bash
# Restart only the backend and worker (e.g., after a code change)
docker compose up -d --force-recreate backend worker

# Start only infrastructure (Postgres, Redis, Mailhog)
docker compose up -d postgres redis mailhog
```

### Check Status

```bash
docker ps
docker compose ps   # shows health status

# Follow backend logs
docker compose logs -f backend

# Follow worker logs
docker compose logs -f worker
```

### Access Services

```bash
# API
curl http://localhost:3000/api/health

# Mailhog web UI (view captured emails)
open http://localhost:8025

# Postgres (via psql)
docker compose exec postgres psql -U hectohr -d hectohr
```

## Service Configuration

### Postgres

```yaml
postgres:
  image: postgres:17-alpine
  environment:
    POSTGRES_USER: ${POSTGRES_USER:-hectohr}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-secret}
    POSTGRES_DB: ${POSTGRES_DB:-hectohr}
  ports:
    - "${POSTGRES_PORT:-5432}:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U hectohr -d hectohr"]
    interval: 10s
    timeout: 5s
    retries: 5
```

Data is persisted in a named volume (`postgres_data`). To reset the database:

```bash
docker compose down -v   # removes volumes
mise run up
pnpm db:migrate
```

### Redis

```yaml
redis:
  image: redis:7-alpine
  command: redis-server --save 60 1 --loglevel warning
  ports:
    - "${REDIS_PORT:-6379}:6379"
  volumes:
    - redis_data:/data
```

BullMQ job state is persisted in a named volume (`redis_data`).

### Mailhog

```yaml
mailhog:
  image: mailhog/mailhog:latest
  ports:
    - "1025:1025"   # SMTP — backend/worker send mail here
    - "8025:8025"   # Web UI — view captured emails
```

Mailhog captures all SMTP traffic and shows it at `http://localhost:8025`. No mail leaves your machine during development.

> **SMTP_HOST in Docker**: The backend and worker containers connect to Mailhog using the Docker service name `mailhog`. **Do not** set `SMTP_HOST=localhost` in `.env` — that overrides the service name and breaks mail delivery inside the containers. The `docker-compose.yml` defaults `SMTP_HOST` to `mailhog` automatically when the variable is unset.

### Backend

```yaml
backend:
  environment:
    NODE_ENV: production
    DATABASE_URL: postgresql://hectohr:secret@postgres:5432/hectohr
    REDIS_HOST: redis
    SMTP_HOST: ${SMTP_HOST:-mailhog}
    JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
    JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
    EMAIL_VERIFICATION_SECRET: ${EMAIL_VERIFICATION_SECRET}
    CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost:4200}
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
  healthcheck:
    test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health || exit 1"]
    interval: 15s
    timeout: 5s
    retries: 3
    start_period: 30s
```

### Worker

The worker runs from the same Docker image as the backend but with a different entrypoint:

```yaml
worker:
  command: ["node", "worker.js"]
  environment:
    REDIS_HOST: redis
    SMTP_HOST: ${SMTP_HOST:-mailhog}
    # ... SMTP credentials
  depends_on:
    redis:
      condition: service_healthy
```

The worker does **not** need Postgres — it only reads jobs from Redis and sends emails.

## Multi-Stage Dockerfile

The same `Dockerfile` produces one image used for both `backend` and `worker` services.

### Stages

#### Stage 1: base
Prepares the Alpine environment with pnpm:
```dockerfile
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
```

#### Stage 2: deps
Installs all dependencies (including dev) with a frozen lockfile:
```dockerfile
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json apps/backend/
# ... copy all lib package.json files
RUN pnpm install --frozen-lockfile
```

#### Stage 3: builder
Builds both bundles (backend HTTP server + worker):
```dockerfile
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm nx sync
RUN pnpm nx run backend:prune   # produces main.js + worker.js in dist/
```

#### Stage 4: runner
Minimal production image (~200 MB):
```dockerfile
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/backend/dist/package.json ./
COPY --from=builder /app/apps/backend/dist/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts
COPY --from=builder /app/apps/backend/dist/main.js ./main.js
COPY --from=builder /app/apps/backend/dist/worker.js ./worker.js
EXPOSE 3000
CMD ["node", "main.js"]
```

The `worker` service in `docker-compose.yml` overrides `CMD` to `["node", "worker.js"]`.

### Image Size Breakdown

```
Stage 2 (deps):   ~700 MB (all deps + devDeps)
Stage 3 (builder): ~800 MB (deps + source + compiled bundles)
Stage 4 (runner):  ~200 MB (Alpine + prod deps + main.js + worker.js)
```

## Building & Testing

### Build Locally

```bash
docker build -f apps/backend/Dockerfile -t hectohr-backend:latest .
```

### Run the Image Standalone

```bash
# Backend (requires external Postgres + Redis)
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_HOST=... \
  -e JWT_ACCESS_SECRET=... \
  -e JWT_REFRESH_SECRET=... \
  -e EMAIL_VERIFICATION_SECRET=... \
  hectohr-backend:latest

# Worker (same image, different command)
docker run \
  -e REDIS_HOST=... \
  -e SMTP_HOST=... \
  hectohr-backend:latest node worker.js
```

## .dockerignore

The `.dockerignore` file excludes:
```
node_modules
.nx
dist
apps/*/node_modules
libs/*/node_modules
.git
.env
.DS_Store
```

Keeping `.env` out of the build context prevents secrets from leaking into the image.

## Deployment Strategies

The examples below are generic illustrations of the build → push → run pattern for other
registries/platforms. The concrete, working implementation of this pattern for this project's
actual VPS (GHCR + Caddy + docker-compose.prod.yml) is `scripts/deploy/build-and-push.sh` +
`scripts/deploy/deploy.sh` — see [`docs/deployment.md`](./deployment.md).

### Cloud Deployment

```bash
# 1. Build
docker build -f apps/backend/Dockerfile -t my-registry.com/hectohr:latest .

# 2. Push
docker push my-registry.com/hectohr:latest

# 3. Deploy backend
docker run -d --name hectohr-backend \
  -p 3000:3000 \
  -e DATABASE_URL=... \
  -e REDIS_HOST=... \
  -e JWT_ACCESS_SECRET=... \
  -e JWT_REFRESH_SECRET=... \
  -e EMAIL_VERIFICATION_SECRET=... \
  -e SMTP_HOST=smtp.sendgrid.net \
  -e SMTP_USER=apikey \
  -e SMTP_PASS=<sendgrid-api-key> \
  -e SMTP_PORT=587 \
  my-registry.com/hectohr:latest

# 4. Deploy worker (same image, different command)
docker run -d --name hectohr-worker \
  -e REDIS_HOST=... \
  -e SMTP_HOST=smtp.sendgrid.net \
  -e SMTP_USER=apikey \
  -e SMTP_PASS=<sendgrid-api-key> \
  my-registry.com/hectohr:latest \
  node worker.js
```

### Kubernetes

```yaml
# backend deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hectohr-backend
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: backend
        image: my-registry.com/hectohr:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: hectohr-secrets
              key: database-url
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 20
          periodSeconds: 15
---
# worker deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hectohr-worker
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: worker
        image: my-registry.com/hectohr:latest
        command: ["node", "worker.js"]
        env:
        - name: REDIS_HOST
          value: redis-service
```

### GitHub Actions

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -f apps/backend/Dockerfile -t hectohr:${{ github.sha }} .

      - name: Push to registry
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker push hectohr:${{ github.sha }}
```

## Backups & Disaster Recovery

Two things write backups into the shared `db_backups` volume, both via `libs/backend/database/scripts/backup.sh`:

- **Pre-deploy**: the `migrate` service runs `backup.sh` before every migration (`migrate-entrypoint.sh`) — a safety net around deploys.
- **Nightly**: the `backup` service (`postgres:17-alpine` + `scripts/backup/nightly-loop.sh`) runs the same `backup.sh` once at container start, then every 24h at `BACKUP_HOUR` UTC (default `3`) — covers data changed *between* deploys.

Both write `hectohr_<timestamp>.dump` files into one pool and share one retention rule: `BACKUP_RETENTION` (default `14`), oldest dumps pruned first once that count is exceeded.

This is a same-box backup: it protects against accidental data deletion/corruption, but **not** against total VPS loss (disk failure, provider incident) since the dumps live on the same machine as Postgres. Copying `db_backups` to offsite storage (e.g. rclone → Backblaze B2/S3) is a good next step before scaling up.

### Restoring from a backup (manual — test this before you need it)

`libs/backend/database/scripts/restore.sh` does the actual restore (via `pg_restore --clean --if-exists`) against whatever `DATABASE_URL` points at, with a type-the-filename confirmation before it touches anything.

```bash
# 1. List available dumps
docker compose -f docker-compose.prod.yml exec backup ls -la /backups

# 2. Test-restore into a scratch database first — never restore over prod unverified
docker compose -f docker-compose.prod.yml exec postgres createdb -U "$POSTGRES_USER" restore_test
docker compose -f docker-compose.prod.yml run --rm \
  -e DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@postgres:5432/restore_test" \
  migrate sh libs/backend/database/scripts/restore.sh /backups/hectohr_<timestamp>.dump

# 3. Sanity-check row counts / spot-check a few tables
docker compose -f docker-compose.prod.yml exec postgres psql -U "$POSTGRES_USER" -d restore_test -c "select count(*) from users;"

# 4. Once verified, restore for real onto prod (stop the backend first so nothing writes mid-restore)
docker compose -f docker-compose.prod.yml stop backend worker
docker compose -f docker-compose.prod.yml run --rm migrate sh libs/backend/database/scripts/restore.sh /backups/hectohr_<timestamp>.dump
docker compose -f docker-compose.prod.yml start backend worker

# 5. Clean up the scratch database
docker compose -f docker-compose.prod.yml exec postgres dropdb -U "$POSTGRES_USER" restore_test
```

Do steps 1–3 once right after deploying the `backup` service, so you know the dumps are actually restorable — a backup nobody has ever restored is not a backup.

## Monitoring

Three layers, each covering a blind spot the others miss:

| Layer | Tool | Catches |
|-------|------|---------|
| Logs | Loki + Promtail + Grafana (`docker-compose.prod.yml`) | Searching/aggregating log lines across containers |
| Errors | Sentry (`SENTRY_DSN` / `VITE_SENTRY_DSN`) | Unhandled exceptions with stack trace + request/user context, deduped and alertable |
| Uptime | External monitor (not in this repo) | The VPS itself going dark — the one failure mode nothing *inside* the box can report |

### Sentry

Set `SENTRY_DSN` for the backend and `VITE_SENTRY_DSN` for the manager app (see `.env.example`). Leave unset in local dev — both SDKs no-op without a DSN. See `apps/backend/src/main.ts`, `apps/manager/src/main.tsx`, and the Expo apps' root layouts (`apps/employee/app/_layout.tsx`, `apps/visitor/app/_layout.tsx`) for where each SDK is initialized.

For the employee/visitor mobile apps, set `EXPO_PUBLIC_SENTRY_DSN` before running an EAS build (`eas env:create` or the EAS dashboard) — `EXPO_PUBLIC_`-prefixed vars get inlined into the JS bundle at build time, so it must be present then, not just at runtime.

### External uptime monitor

Not automatable from this repo (it's a third-party account) — set this up manually once the backend is deployed:

1. Sign up for a free monitor (e.g. [UptimeRobot](https://uptimerobot.com), [Better Uptime](https://betteruptime.com))
2. Point it at `https://<your-domain>/api/health`, checking every 1–5 minutes
3. Add your email (and SMS/Slack if the free tier allows) as the alert contact
4. Optionally add a second monitor on the manager app's root URL to catch frontend-hosting outages separately from the API

This is the only check that still fires if the whole VPS is unreachable — Grafana and Sentry both live on the same box and go dark with it.

## Production Checklist

Before deploying to production:

- [ ] Set strong `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `EMAIL_VERIFICATION_SECRET` (≥ 32 chars each)
- [ ] Set `SMTP_HOST` to a real provider (SendGrid, SES, Postmark, etc.) — not `mailhog`
- [ ] Set `SMTP_USER` and `SMTP_PASS` for authenticated SMTP
- [ ] Set `SMTP_SECURE=true` if using port 465
- [ ] Set `REDIS_PASSWORD` for production Redis
- [ ] Set `REDIS_TLS=true` if using managed Redis (Upstash, ElastiCache)
- [ ] Set `CORS_ORIGINS` to your actual frontend domain
- [ ] Run `pnpm db:migrate` against the production database on each deploy
- [ ] Confirm the `backup` service is running and do one manual restore test (see above)
- [ ] Set `SENTRY_DSN` (backend) and `VITE_SENTRY_DSN` (manager) for error tracking
- [ ] Set up an external uptime monitor against `/api/health` (see [Monitoring](#monitoring))

## Troubleshooting

### Worker sends emails to localhost instead of Mailhog

**Cause**: `SMTP_HOST=localhost` is set in `.env`.

**Fix**: Remove or comment out `SMTP_HOST` from `.env`. Docker Compose uses `mailhog` by default.

### Container exits immediately

```bash
docker compose logs backend   # check error output
```

Common causes:
- Missing required env var (e.g., `JWT_ACCESS_SECRET` not set) — NestJS will throw on startup
- Database not yet healthy — wait a few seconds and retry, or increase `start_period`

### Health check failing

```bash
# Test manually inside the container
docker compose exec backend wget -qO- http://localhost:3000/api/health
```

If it fails, check logs for startup errors. Increase `start_period` in `docker-compose.yml` if the app takes longer to start.

### Postgres volume corruption

```bash
docker compose down -v   # WARNING: destroys all data
mise run up
pnpm db:migrate
pnpm seed            # optional: re-seed
```

### Build fails in CI

```bash
# Clear Docker build cache
docker builder prune

# Rebuild from scratch
docker build --no-cache -f apps/backend/Dockerfile -t hectohr:latest .
```

## Performance Optimization

- **Enable BuildKit**: `DOCKER_BUILDKIT=1 docker build ...` (~30% faster builds)
- **Layer order**: Dockerfile copies `package.json` files before source code — unchanged deps reuse cache
- **`.dockerignore`**: Excluding `node_modules` and `.git` keeps the build context small
- **Worker replicas**: Scale `worker` replicas independently of `backend` for high email throughput
