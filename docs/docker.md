# Docker & Deployment

This guide covers Docker setup, containerization, and deployment strategies.

## Overview

The project includes:
- **`apps/backend/Dockerfile`**: Multi-stage production build for NestJS backend
- **`docker-compose.yml`**: Local development environment with healthchecks
- **`.dockerignore`**: Excludes unnecessary files from build context

All configurations are optimized for cross-platform compatibility (macOS, Linux, Windows).

## Docker Compose: Local Development

### Start Containers

```bash
mise run up
```

This runs `docker compose up --build -d` which:
1. Builds the backend image
2. Starts the backend container
3. Exposes port 3000

### Stop Containers

```bash
mise run down
```

This runs `docker compose down`, stopping and removing all containers.

### Check Status

```bash
docker ps
docker logs hectohr-backend-1

# Follow logs in real-time
docker logs -f hectohr-backend-1
```

### Access the Backend

```bash
# From your machine
curl http://localhost:3000/api

# From another container
docker exec hectohr-backend-1 wget -qO- http://localhost:3000/api
```

## Docker Compose Configuration

### docker-compose.yml

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    ports:
      - "${BACKEND_PORT:-3000}:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s
```

### Key Settings

- **build**: Builds from `apps/backend/Dockerfile` (multi-stage)
- **ports**: Maps host port 3000 to container port 3000
- **environment**: Sets `NODE_ENV=production` (ensures optimized code)
- **restart**: Automatically restart if it crashes (`unless-stopped` = manual docker stop required)
- **healthcheck**: Docker polls `/api/health` every 15 seconds to verify service is healthy

### Customizing the Port

Set `BACKEND_PORT` environment variable:

```bash
# Local machine
BACKEND_PORT=3001 mise run up

# Docker Compose will map localhost:3001 → container:3000
curl http://localhost:3001/api
```

## Multi-Stage Dockerfile

### Stages

```dockerfile
FROM node:22-alpine AS base
# Alpine Linux is minimal (~150MB vs 500MB+ for full Node)
# Enables corepack for pnpm

FROM base AS deps
# Install all dependencies (including dev)
# Runs pnpm install with frozen lockfile (reproducible)

FROM base AS builder
# Copy deps from stage 1
# Run Nx build and prune
# Creates dist/ with production-ready code and dependencies

FROM base AS runner
# Copy ONLY runtime artifacts from builder
# Install production deps only
# Final image size: ~200MB (vs 1GB+ with all deps)
```

### Stage Details

#### Stage 1: base
Prepares the Alpine environment:
```dockerfile
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable  # Enables pnpm via Node's corepack
```

#### Stage 2: deps
Installs dependencies:
```dockerfile
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json apps/backend/package.json
RUN pnpm install --frozen-lockfile
```

**Why frozen-lockfile?**
- Ensures exact versions match `pnpm-lock.yaml`
- Prevents unexpected dependency updates
- Reproducible builds across machines

#### Stage 3: builder
Builds the application:
```dockerfile
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY . .

# Sync TypeScript project references
RUN pnpm nx sync

# Build and prune (creates dist/package.json + dist/pnpm-lock.yaml with prod deps only)
RUN pnpm nx run backend:prune

# Create directories for COPY in runner stage to not fail
RUN mkdir -p apps/backend/dist/workspace_modules apps/backend/dist/assets
```

**Key commands:**
- `pnpm nx sync`: Updates TypeScript references (required in non-interactive Docker environment)
- `pnpm nx run backend:prune`: Nx target that runs webpack build + prune-lockfile + copy-workspace-modules

#### Stage 4: runner
Runs the application in production:
```dockerfile
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy pruned package.json and lockfile
COPY --from=builder /app/apps/backend/dist/package.json ./package.json
COPY --from=builder /app/apps/backend/dist/pnpm-lock.yaml ./pnpm-lock.yaml

# Install only production dependencies (no devDependencies)
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy compiled code and workspace modules
COPY --from=builder /app/apps/backend/dist/workspace_modules ./node_modules/
COPY --from=builder /app/apps/backend/dist/main.js ./main.js
COPY --from=builder /app/apps/backend/dist/assets ./assets

EXPOSE 3000
CMD ["node", "main.js"]
```

**Why this approach?**
- ✅ **Minimal image**: Only production code/deps (no source, no TS, no dev tools)
- ✅ **Fast rebuilds**: `deps` stage cached unless lockfile changes
- ✅ **Secure**: No source code or dev dependencies in runtime image

### Image Size Breakdown

```
Stage 2 (deps):   ~500MB (all deps including @nestjs, webpack, etc.)
Stage 3 (builder): ~600MB (deps + source + compiled code)
Stage 4 (runner):  ~200MB (prod code + production deps only)
```

## Building & Testing

### Build Locally

```bash
# One-time build
docker build -f apps/backend/Dockerfile -t hectohr-backend:prod .

# With build cache (faster on subsequent builds)
docker build -f apps/backend/Dockerfile -t hectohr-backend:prod .

# With custom tag
docker build -f apps/backend/Dockerfile -t my-registry.com/hectohr:v1.0.0 .
```

### Run Locally

```bash
# Interactive (see logs in terminal)
docker run -it -p 3000:3000 hectohr-backend:prod

# Daemon mode (run in background)
docker run -d -p 3000:3000 --name hectohr-backend hectohr-backend:prod

# With environment variables
docker run -it -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  hectohr-backend:prod

# Check logs
docker logs hectohr-backend

# Stop and remove
docker stop hectohr-backend
docker rm hectohr-backend
```

### Test Image

```bash
# Build and start
docker run -it -p 3000:3000 hectohr-backend:prod

# In another terminal, test
curl http://localhost:3000/api
curl http://localhost:3000/api/health
```

## .dockerignore

The `.dockerignore` file excludes unnecessary files from the Docker build context:

```
node_modules
.nx
dist
apps/*/node_modules
.git
.gitignore
.env
.DS_Store
```

**Benefits**:
- ✅ Faster build (fewer files to copy)
- ✅ Prevents secrets leaking (exclude `.env`)
- ✅ Cleaner context (exclude git history, OS files)

## Deployment Strategies

### Local (Docker Compose)

```bash
mise run up
```

Ideal for:
- Local development
- CI/CD testing
- Team collaboration

### Cloud Deployment (Generic)

After building the image, push to a registry and deploy:

```bash
# 1. Build
docker build -f apps/backend/Dockerfile -t my-registry.com/hectohr:latest .

# 2. Push
docker push my-registry.com/hectohr:latest

# 3. Deploy (depends on platform)
# - AWS ECS: Create task definition with image
# - Google Cloud Run: Deploy from registry
# - Kubernetes: Create pod with image
# - Heroku: Deploy via container registry
```

### Docker Swarm

```bash
docker swarm init

docker service create \
  --name hectohr-backend \
  --publish 3000:3000 \
  --env NODE_ENV=production \
  --replicas 2 \
  my-registry.com/hectohr:latest
```

### Kubernetes

Create a manifest (`hectohr-deployment.yaml`):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hectohr-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hectohr-backend
  template:
    metadata:
      labels:
        app: hectohr-backend
    spec:
      containers:
      - name: backend
        image: my-registry.com/hectohr:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 15
```

Deploy with:

```bash
kubectl apply -f hectohr-deployment.yaml
kubectl get pods
kubectl logs -f hectohr-backend-<pod-id>
```

## Healthchecks

Docker Compose includes a healthcheck:

```yaml
healthcheck:
  test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health || exit 1"]
  interval: 15s
  timeout: 5s
  retries: 3
  start_period: 10s
```

This:
- ✅ Polls `/api/health` every 15 seconds
- ✅ Waits 10 seconds before first check (app startup time)
- ✅ Restarts container if 3 checks fail

### Check Status

```bash
docker inspect hectohr-backend-1 | grep -A 5 "Health"
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -f apps/backend/Dockerfile -t hectohr:${{ github.sha }} .

      - name: Push to registry
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker push hectohr:${{ github.sha }}

      - name: Deploy
        run: |
          # Your deployment command here
          echo "Deploying to production"
```

### GitLab CI Example

```yaml
build_image:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -f apps/backend/Dockerfile -t $CI_REGISTRY_IMAGE:latest .
    - docker push $CI_REGISTRY_IMAGE:latest
```

## Cross-Platform Compatibility

The setup is tested on:
- ✅ **Linux** (native Docker)
- ✅ **macOS** (Docker Desktop, Colima, Orbstack)
- ✅ **Windows** (Docker Desktop, WSL2)

**Compatibility notes:**
- Alpine Linux in containers ensures consistency across platforms
- pnpm lockfile locks all platform-specific binaries (@swc/core, etc.)
- Dockerfile has no platform-specific commands

### Platform-Specific Setup

**macOS with Docker Desktop**:
```bash
# Install mise
curl https://mise.jdx.dev/install.sh | sh

# Add to ~/.zshrc
eval "$(mise activate zsh)"

# Restart terminal, then
mise run up
```

**Windows with WSL2**:
```bash
# In WSL2 terminal
curl https://mise.jdx.dev/install.sh | sh

# Add to ~/.bashrc
eval "$(mise activate bash)"

# Then
mise run up
```

**Linux**:
```bash
# Native Docker (no virtualization layer)
mise run up
```

## Troubleshooting

### Container won't start

```bash
# View error logs
docker logs hectohr-backend-1

# Common issues:
# - Port 3000 already in use: docker run -p 3001:3000 ...
# - Out of memory: increase Docker memory limit
# - Missing env vars: check docker-compose.yml
```

### Build fails with "package not found"

```bash
# Clear Docker build cache
docker build --no-cache -f apps/backend/Dockerfile -t hectohr:latest .

# Or remove all unused Docker resources
docker system prune -a
```

### Slow builds on macOS/Windows

**Cause**: Docker runs in a VM; I/O is slower.

**Solutions**:
1. Exclude large directories in `.dockerignore`
2. Use Docker build cache (don't use `--no-cache`)
3. Build on native Linux (GitHub Actions, etc.)

### Health check fails

```bash
# Test health endpoint manually
docker exec hectohr-backend-1 wget -qO- http://localhost:3000/api/health

# If it fails:
# - Check /api/health endpoint exists in code
# - Check app is fully started (wait longer with start_period)
# - Check logs: docker logs hectohr-backend-1
```

## Performance Optimization

### Image Size

Current: ~200MB

Reduce further with:
```dockerfile
# Use node:alpine instead of node:22-alpine (saves ~10MB)
FROM node:alpine AS base

# Remove optional dependencies
RUN apk del build-base python3  # (if not needed)
```

### Build Speed

- **Enable BuildKit**: `DOCKER_BUILDKIT=1 docker build ...` (~30% faster)
- **Use .dockerignore**: Reduces build context size
- **Order Dockerfile commands**: Most-changing commands last (maximize cache hits)

### Runtime Performance

- **Alpine vs Debian**: Alpine is lighter but slower at startup (~500ms). Tradeoff between size and speed.
- **Node options**: Add to `CMD` for memory tuning: `CMD ["node", "--max-old-space-size=512", "main.js"]`

## Next Steps

- **Development**: Read [Development Guide](./development.md) for local workflows
- **Troubleshooting**: See [Troubleshooting](./troubleshooting.md) for common issues
- **Commands**: See [Commands Reference](./commands.md) for all tasks
