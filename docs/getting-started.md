# Getting Started

This guide walks you through setting up Hectohr for the first time and running the full application stack.

## Prerequisites

### System Requirements
- **Node.js**: Managed by mise (currently v22)
- **pnpm**: Managed by mise (latest)
- **Git**: For version control
- **Docker & Docker Compose**: Required for PostgreSQL, Redis, and Mailhog

### Install mise

Mise is a tool manager that handles Node.js, pnpm, and other tools at the project level—no global installation needed.

**macOS/Linux**:
```bash
curl https://mise.jdx.dev/install.sh | sh
```

**Windows** (using winget):
```bash
winget install mise-en-place
```

**Or via Chocolatey**:
```bash
choco install mise
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

Add this to your shell rc file (`.zshrc`, `.bashrc`, etc.) for automatic activation on every terminal open.

### 3. Verify Tools

Confirm mise has installed the required tools:
```bash
mise ls
```

Expected output:
```
nodejs    22.x.x  (set in mise.toml)
pnpm      10.x.x  (set in mise.toml)
```

### 4. Install Dependencies

```bash
pnpm install
```

This installs all workspace dependencies for the backend, frontend, and all shared libraries.

### 5. Configure Environment

Copy the example environment file and set the required secrets:

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

```bash
# Generate these with: openssl rand -base64 32
JWT_ACCESS_SECRET=<at-least-32-random-chars>
JWT_REFRESH_SECRET=<at-least-32-random-chars>
EMAIL_VERIFICATION_SECRET=<at-least-32-random-chars>
```

> **Important**: Do not set `SMTP_HOST` in `.env` when using Docker Compose — the compose file defaults it to the `mailhog` service. Only set it if running the backend directly without Docker (`SMTP_HOST=localhost`).

### 6. Start Infrastructure

Start PostgreSQL, Redis, and Mailhog via Docker Compose:

```bash
mise run up
```

This starts:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **Mailhog** SMTP on port 1025, web UI on port 8025

Verify containers are running:
```bash
docker ps
```

### 7. Apply Database Migrations

```bash
pnpm db:migrate
```

This applies all pending SQL migrations in `libs/backend/database/migrations/`. Run this after every `pnpm db:generate`.

### 8. (Optional) Seed the Database

Populate the database with initial users for development:

```bash
pnpm seed
```

Creates sample users with password `hecto123`.

## First Run

### Start the Backend

```bash
pnpm dev:backend
```

Or using Nx directly:
```bash
pnpm nx serve backend
```

Expected output:
```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] DatabaseModule dependencies initialized
[Nest] LOG [InstanceLoader] QueueModule dependencies initialized
[Nest] LOG [InstanceLoader] AuthModule dependencies initialized
[Nest] LOG [NestApplication] Nest application successfully started +2ms
```

The API is available at `http://localhost:3000/api`.

### Start the Frontend

In a separate terminal:

```bash
pnpm dev:manager
```

The React app is available at `http://localhost:4200`.

### (Optional) Start the Worker

The worker processes background jobs (email sending). In Docker Compose it runs automatically. For local development without Docker, start it separately:

```bash
pnpm dev:worker
```

### Test the API

```bash
# Health check
curl http://localhost:3000/api/health
# {"status":"ok"}

# Initiate registration (sends a verification email)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'
```

### View Sent Emails

During development, all emails are captured by Mailhog. Open `http://localhost:8025` to see the Mailhog inbox — verification codes and welcome emails appear here.

## Running Tests

```bash
# Run all tests (all projects)
pnpm test

# Run backend tests in watch mode
pnpm nx test backend --watch

# Run backend tests once
pnpm nx test backend
```

## Code Quality

```bash
# Lint all code
pnpm lint

# Type-check all projects
pnpm typecheck

# All checks (lint + typecheck + test)
pnpm lint && pnpm typecheck
```

## Database Workflow

### Generate a Migration

After editing a schema file in `libs/backend/database/src/lib/schema/`:

```bash
pnpm db:generate
```

This creates a new SQL file in `libs/backend/database/migrations/`.

### Apply Migrations

```bash
pnpm db:migrate
```

### Browse the Database Visually

```bash
pnpm db:studio
```

Opens Drizzle Studio at `https://local.drizzle.studio` — a visual database browser.

### Push Schema Directly (Dev Only)

```bash
pnpm db:push
```

Pushes schema changes directly without creating migration files. Useful for rapid iteration during development; **do not use in production**.

## Environment Configuration

### Full `.env` Reference

```bash
# App
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://hectohr:secret@localhost:5432/hectohr

# JWT (min 32 chars each)
JWT_ACCESS_SECRET=change-me-access-secret-at-least-32-chars
JWT_REFRESH_SECRET=change-me-refresh-secret-at-least-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email verification OTP (min 32 chars)
EMAIL_VERIFICATION_SECRET=change-me-otp-secret-at-least-32-chars

# CORS
CORS_ORIGINS=http://localhost:4200

# Redis
REDIS_HOST=localhost   # set only for local dev without Docker
REDIS_PORT=6379

# SMTP
# Do NOT set SMTP_HOST here when using Docker Compose (defaults to 'mailhog')
SMTP_PORT=1025
SMTP_FROM=noreply@hectohr.io
```

### Add a New Environment Variable

1. Add to `.env` and `.env.example`
2. Use in code via `ConfigService`:
   ```typescript
   constructor(private config: ConfigService) {}

   get value() {
     return this.config.getOrThrow('MY_VAR');
   }
   ```
3. Add to `docker-compose.yml` for the relevant services

## Troubleshooting

### Port 3000 Already in Use

```bash
lsof -ti:3000 | xargs kill -9   # macOS/Linux
netstat -ano | findstr :3000    # Windows (then taskkill /PID <pid> /F)
```

### Emails Not Arriving in Mailhog

Check that `SMTP_HOST` is **not** set in `.env` (Docker Compose sets it automatically to `mailhog`). If it's set to `localhost`, the worker container can't reach Mailhog.

If running the backend locally without Docker, set `SMTP_HOST=localhost`.

### Database Connection Refused

Ensure Docker containers are running:
```bash
mise run up
docker ps  # postgres should appear
```

If using the local backend without Docker Compose, make sure PostgreSQL is running and `DATABASE_URL` points to it.

### Migrations Not Applied

```bash
pnpm db:migrate
```

If you see schema drift warnings, run `pnpm db:generate` first to create a new migration, then `pnpm db:migrate`.

### Dependencies Not Installed

```bash
pnpm install
```

If that doesn't work, try a clean reinstall:
```bash
rm -rf node_modules apps/*/node_modules libs/*/node_modules
pnpm install
```

### TypeScript Errors in IDE

1. Run `pnpm nx sync` to update project references
2. Restart the TypeScript language server (Ctrl+Shift+P → "TypeScript: Restart TS Server" in VS Code)

## Next Steps

- **Development**: Read [Development Guide](./development.md) for workflows and debugging
- **Architecture**: Read [Architecture](./architecture.md) to understand the project structure
- **Docker**: Read [Docker & Deployment](./docker.md) for containerization details
- **Commands**: See [Commands Reference](./commands.md) for the full task list

## IDE Extensions (Recommended)

- **VS Code**: Install extensions from `.vscode/extensions.json`:
  - Nx Console (execute Nx targets visually)
  - ESLint (real-time linting)
  - Prettier (code formatting)
  - Docker (Docker support)
  - Jest Runner (run/debug tests)

- **JetBrains IDEs** (IntelliJ, WebStorm):
  - Install Nx Console plugin from marketplace
  - Built-in TypeScript, ESLint, Jest support

## Quick Reference

| What | Command |
|------|---------|
| Start backend (dev) | `pnpm dev:backend` |
| Start frontend | `pnpm dev:manager` |
| Start infrastructure | `mise run up` |
| Apply migrations | `pnpm db:migrate` |
| Seed database | `pnpm seed` |
| View emails | `http://localhost:8025` |
| Run tests | `pnpm test` |
| Lint code | `pnpm lint` |
| Type-check | `pnpm typecheck` |
| Full check | `pnpm lint && pnpm typecheck` |
| Stop Docker | `mise run down` |
| Build for production | `pnpm build` |
