# Hectohr Documentation

Hectohr is a full-stack HR management system built as an Nx monorepo. It provides employee management, shift scheduling, and leave tracking with a role-based permission model.

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

# Seed demo users and default leave types
mise run seed

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
| **Seed database** | `mise run seed` | Seed demo users + default leave types |
| **View emails (dev)** | Open `http://localhost:8025` | Mailhog web UI |

## Documentation Structure

- **[Getting Started](./getting-started.md)** — Detailed setup, first run, and verification
- **[Development Guide](./development.md)** — Daily workflow, hot-reload, debugging
- **[Architecture](./architecture.md)** — Project structure, tech stack, design decisions
- **[Docker & Deployment](./docker.md)** — Docker Compose services, multi-stage builds, healthchecks
- **[Troubleshooting](./troubleshooting.md)** — Common issues and solutions
- **[Commands Reference](./commands.md)** — Complete task list and flags

## Key Features

**Authentication**
- 2-step registration with 6-digit OTP email verification
- Stateful JWT with per-device session management (list, revoke, revoke-all)
- Argon2id password hashing

**Employee Management**
- CRUD with roles: `admin`, `hr`, `manager`, `employee`
- Employee profiles (position, department, phone, hire date, notes)
- Invitation system — managers/HR invite new employees via email
- Soft deactivation (preserves history)

**Schedule Management**
- Weekly calendar view with per-employee shift rows
- Create, edit, and delete individual shifts
- Recurring shifts (repeat on selected weekdays, optional end date)
- Bulk delete: all future shifts or all shifts for an employee
- Copy current week's shifts to next week
- Color-coded chips (gray < 6h, indigo 6–9h, amber > 9h) and weekly total hours
- Employee filter

**Leave Management**
- Configurable leave types per organisation (name, code, color, annual quota, paid/unpaid)
- Default types seeded on setup: **Sick Leave** (10 d) and **Holiday Leave** (20 d)
- Per-employee leave balances per year (quota or unlimited)
- Employee request flow: submit → manager approves/rejects/cancels
- Balance tracking: used days, pending days, remaining
- Manager can edit actual days taken on any request (corrects non-working days); tracked with `isEdited` + audit fields
- Manager grid view: all employees × leave types, click to set quota

**RBAC**
- `RolesGuard` + `@Roles()` decorator on all manager/HR/admin endpoints
- Frontend route guards redirect employees away from manager pages

**Infrastructure**
- Async email delivery via BullMQ + Redis (Mailhog in dev)
- Structured request logging (pino-http)
- Drizzle ORM schema-first migrations
- Nx task caching and incremental builds

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
│   │   ├── employees/        # @hecto/employees — employee CRUD + profiles
│   │   ├── leave/            # @hecto/leave — leave types, balances, requests
│   │   ├── mail/             # @hecto/mail — Nodemailer + email templates
│   │   ├── queue/            # @hecto/queue — BullMQ jobs + processors
│   │   ├── shifts/           # @hecto/shifts — shifts + recurring shifts
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

## Demo Accounts (after seed)

| Email | Password | Role |
|-------|----------|------|
| `admin@hecto.dev` | `hecto123` | admin |
| `hr@hecto.dev` | `hecto123` | hr |
| `manager@hecto.dev` | `hecto123` | manager |
| `employee@hecto.dev` | `hecto123` | employee |
