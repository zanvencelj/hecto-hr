# Getting Started

This guide walks you through setting up Hectohr for the first time and running the backend application.

## Prerequisites

### System Requirements
- **Node.js**: Managed by mise (currently v22)
- **pnpm**: Managed by mise (latest)
- **Git**: For version control
- **Docker & Docker Compose** (optional): For running containers locally

### Install mise

Mise is a tool manager that handles Node.js, pnpm, and other tools at the project level—no global installation needed.

**macOS/Linux**:
```bash
curl https://mise.jdx.dev/install.sh | sh
```

**Windows** (using Chocolatey):
```bash
choco install mise
```

**Or via Windows Package Manager**:
```bash
winget install mise-en-place
```

For other installation methods, see [mise docs](https://mise.jdx.dev/getting-started.html).

## Initial Setup

### 1. Clone the Repository
```bash
git clone <repo-url> hectohr
cd hectohr
```

### 2. Activate mise

Mise auto-activates in the project directory. To manually activate your shell:

**Zsh**:
```bash
eval "$(mise activate zsh)"
```

**Bash**:
```bash
eval "$(mise activate bash)"
```

**Fish**:
```bash
mise activate fish | source
```

Add this to your shell rc file (`.zshrc`, `.bashrc`, etc.) for automatic activation:
```bash
eval "$(mise activate zsh)"
```

### 3. Verify Tools

Confirm mise has installed the required tools:
```bash
mise ls
```

Expected output (Node v22, pnpm latest):
```
nodejs    22.x.x  (set in mise.toml)
pnpm      10.x.x  (set in mise.toml)
```

### 4. Install Dependencies

```bash
pnpm install
```

This installs:
- Root workspace dependencies (ESLint, Jest, TypeScript, Nx)
- Backend dependencies (NestJS, Express, RxJS, etc.)

## First Run

### Development Mode (Hot-Reload)

Start the backend with automatic file-change detection and fast restarts:

```bash
mise run dev
```

Or using Nx directly:
```bash
pnpm nx serve backend
```

Expected output:
```
[Nest] 12345  - 04/24/2026, 8:00:00 PM    LOG   [NestFactory] Starting Nest application...
[Nest] 12345  - 04/24/2026, 8:00:00 PM    LOG   [InstanceLoader] ConfigHostModule dependencies initialized +5ms
[Nest] 12345  - 04/24/2026, 8:00:00 PM    LOG   [InstanceLoader] AppModule dependencies initialized +0ms
[Nest] 12345  - 04/24/2026, 8:00:00 PM    LOG   [RoutesResolver] AppController {/api}:
[Nest] 12345  - 04/24/2026, 8:00:00 PM    LOG   [RouterExplorer] Mapped {/api, GET} route +1ms
[Nest] 12345  - 04/24/2026, 8:00:00 PM    LOG   [RoutesResolver] HealthController {/api/health}:
[Nest] 12345  - 04/24/2026, 8:00:00 PM    LOG   [NestApplication] Nest application successfully started +2ms
```

### Test the API

In another terminal, test the running backend:

```bash
# Main endpoint
curl http://localhost:3000/api

# Health check
curl http://localhost:3000/api/health
```

Expected responses:
```json
{"message":"Hello API"}
```

```json
{"status":"ok"}
```

### Hot-Reload in Action

1. Edit `apps/backend/src/app/app.service.ts`
2. Change the message (e.g., `message: 'Hello Hectohr'`)
3. Save the file — observe the terminal:
   ```
   Restarting application on file changes...
   [Nest] ... NestApplication successfully started
   ```
4. Test the API again — the new message appears within ~200–300ms

## Running Tests

```bash
# Run all tests (all projects)
mise run test

# Run backend tests in watch mode
mise run test-backend

# Run backend tests once
pnpm nx test backend
```

## Code Quality

```bash
# Lint all code
mise run lint

# Type-check all projects
mise run typecheck

# All checks (lint + typecheck + test)
mise run check
```

## Docker Setup

### Start Containers

```bash
mise run up
```

This starts the backend container (configured for production). Access it at `http://localhost:3000`.

### Stop Containers

```bash
mise run down
```

### Verify Container Health

```bash
docker ps
docker logs hectohr-backend-1  # tail logs
```

The backend includes a healthcheck endpoint (`GET /api/health`). Docker polls it every 15 seconds—if unhealthy, the container restarts.

## Development with Docker

If you want to run development mode inside a container:

```bash
# Build development image with pnpm
docker build -f apps/backend/Dockerfile -t hectohr-backend:dev .

# Run in development mode (with hot-reload volume)
docker run -it \
  -p 3000:3000 \
  -e NODE_ENV=development \
  -e SWCRC=true \
  -v $(pwd)/apps/backend/src:/app/apps/backend/src \
  hectohr-backend:dev \
  node --watch --require @swc-node/register ./src/main.ts
```

## Environment Configuration

### .env File

Create `.env` in the root directory (or copy from `.env.example`):

```bash
cp .env.example .env
```

Example `.env`:
```
NODE_ENV=development
PORT=3000
BACKEND_PORT=3000
```

The backend loads `.env` via `@nestjs/config`:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
})
```

## Troubleshooting

### Port 3000 Already in Use

If you see `EADDRINUSE: address already in use :::3000`:

```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9   # macOS/Linux
netstat -ano | findstr :3000    # Windows (then taskkill /PID <pid> /F)

# Or start backend on a different port
PORT=3001 pnpm nx serve backend
```

### Dependencies Not Installed

If you see `Cannot find module '@nestjs/common'`:

```bash
pnpm install
```

If that doesn't work, try a clean reinstall:

```bash
rm -rf node_modules apps/*/node_modules
pnpm install
```

### TypeScript Errors in IDE

If your IDE shows TypeScript errors:

1. Verify TypeScript is installed: `pnpm ls typescript`
2. Restart your IDE's TypeScript language server (Ctrl+Shift+P → "TypeScript: Restart TS Server")
3. Check `tsconfig.base.json` and `apps/backend/tsconfig.json` are valid JSON

### Module Not Found During Build

If `npm exec nx build backend` fails with missing modules:

```bash
# Ensure all peer dependencies are installed
pnpm install

# Then rebuild
pnpm nx build backend
```

## Next Steps

- **Development**: Read [Development Guide](./development.md) for workflows and debugging
- **Architecture**: Read [Architecture](./architecture.md) to understand the project structure
- **Docker**: Read [Docker & Deployment](./docker.md) for containerization details
- **Commands**: See [Commands Reference](./commands.md) for the full task list

## IDE Extensions (Recommended)

Set up your IDE for optimal experience:

- **VS Code**: Install extensions from `.vscode/extensions.json`:
  - Nx Console (execute Nx targets visually)
  - ESLint (real-time linting)
  - Prettier (code formatting)
  - Docker (Docker support)
  - Jest Runner (run/debug tests)

- **JetBrains IDEs** (IntelliJ, WebStorm, etc.):
  - Install Nx Console plugin from marketplace
  - Built-in TypeScript, ESLint, Jest support

## Quick Reference

| What | Command |
|------|---------|
| Start backend (dev) | `mise run dev` |
| Run tests | `mise run test` |
| Lint code | `mise run lint` |
| Type-check | `mise run typecheck` |
| Full check | `mise run check` |
| Start Docker | `mise run up` |
| Stop Docker | `mise run down` |
| Build for production | `mise run build` |
