# Hectohr Documentation

Welcome to Hectohr, a full-stack HR management monorepo built with Nx. It features a NestJS backend with JWT authentication, email verification, async job queuing, a React frontend, and full Docker Compose support.

## Quick Start

### Prerequisites
- **Operating System**: macOS, Linux, or Windows
- **No global dependencies required** — all tools are managed by `mise` at the project level
- **Docker & Docker Compose** — required for PostgreSQL, Redis, and Mailhog

### First-Time Setup

```bash
# Install mise (if not already installed)
# macOS/Linux: curl https://mise.jdx.dev/install.sh | sh
# Windows: winget install mise-en-place

cd hectohr

# Activate mise (manages Node.js, pnpm, and other tools)
eval "$(mise activate zsh)"  # or eval "$(mise activate bash)"

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env
# Edit .env and set required secrets (JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, EMAIL_VERIFICATION_SECRET)

# Start infrastructure (Postgres, Redis, Mailhog)
mise run up

# Apply database migrations
pnpm db:migrate

# Start backend with hot-reload (separate terminal)
mise run dev

# Start frontend (separate terminal)
pnpm nx serve manager
```

### Common Tasks

| Task | Command | Purpose |
|------|---------|---------|
| **Start backend** | `mise run dev` | Run backend with hot-reload |
| **Start frontend** | `pnpm nx serve manager` | Run React frontend (Vite) |
| **Run all tests** | `mise run test` | Unit tests with Jest |
| **Lint code** | `mise run lint` | Run ESLint on all projects |
| **Type-check** | `mise run typecheck` | TypeScript type checking |
| **Full quality check** | `mise run check` | lint + typecheck + test all |
| **Build all** | `mise run build` | Webpack build (backend) |
| **Start containers** | `mise run up` | Docker Compose up (daemon mode) |
| **Stop containers** | `mise run down` | Docker Compose down |
| **Generate migration** | `pnpm db:generate` | Create SQL migration from schema changes |
| **Apply migrations** | `pnpm db:migrate` | Apply pending migrations to database |
| **Database UI** | `pnpm db:studio` | Open Drizzle Studio (visual DB browser) |
| **Seed database** | `mise run seed` | Seed with initial users |
| **View emails (dev)** | Open `http://localhost:8025` | Mailhog web UI |

## Documentation Structure

- **[Getting Started](./getting-started.md)** — Detailed setup, first run, and verification
- **[Development Guide](./development.md)** — Daily workflow, hot-reload, debugging
- **[Architecture](./architecture.md)** — Project structure, tech stack, design decisions
- **[Docker & Deployment](./docker.md)** — Docker Compose services, multi-stage builds, healthchecks
- **[Troubleshooting](./troubleshooting.md)** — Common issues and solutions
- **[Commands Reference](./commands.md)** — Complete task list and flags

## Key Features

✅ **Full-Stack Monorepo** — NestJS backend + React frontend in a single Nx workspace  
✅ **Email Verification** — 2-step registration with 6-digit OTP, resend limits, expiry  
✅ **Async Job Queue** — BullMQ + Redis for background email delivery  
✅ **Session-Based Auth** — Stateful JWT with per-device session management  
✅ **Cross-Platform** — Works identically on macOS, Linux, Windows  
✅ **Zero Global Dependencies** — mise manages all tools (Node, pnpm)  
✅ **Fast Hot-Reload** — ~150–300ms restarts with `@swc-node/register`  
✅ **Type-Safe** — TypeScript with strict mode across frontend and backend  
✅ **Docker-First** — Multi-service Compose with healthchecks for all services  

## Project Overview

```
hectohr/
├── apps/
│   ├── backend/              # NestJS API (port 3000)
│   │   ├── src/              # TypeScript source
│   │   ├── src/worker.ts     # BullMQ worker entry point
│   │   └── Dockerfile        # Multi-stage build (backend + worker)
│   └── manager/              # React frontend (port 4200)
│       └── src/              # Vite + TanStack Router + Tailwind CSS
├── libs/
│   ├── backend/
│   │   ├── auth/             # @hecto/auth — JWT, sessions, email verification
│   │   ├── database/         # @hecto/database — Drizzle ORM + migrations
│   │   ├── mail/             # @hecto/mail — Nodemailer + email templates
│   │   ├── queue/            # @hecto/queue — BullMQ jobs + processors
│   │   └── users/            # @hecto/users — user CRUD, argon2id
│   └── shared/
│       ├── api-client/       # @hecto/api-client — Axios client + auth interceptors
│       ├── schemas/          # @hecto/schemas — Zod validation schemas
│       ├── types/            # @hecto/shared-types — shared TypeScript types
│       └── ui/               # @hecto/ui — React component library (Tailwind)
├── docs/                     # This documentation
├── docker-compose.yml        # All services: Postgres, Redis, Mailhog, backend, worker
├── drizzle.config.ts         # Drizzle Kit configuration
├── mise.toml                 # Tool versions & tasks
└── pnpm-workspace.yaml       # pnpm monorepo setup
```

## Support

For detailed guides, see the documentation files listed above. For issues specific to this project, check [Troubleshooting](./troubleshooting.md).
