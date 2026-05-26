# Hectohr

A full-stack HR management system built as an Nx monorepo. Covers employee management, shift scheduling, and leave tracking with a role-based permission model.

## Stack

- **Backend**: NestJS + Drizzle ORM + PostgreSQL + BullMQ (Redis)
- **Frontend**: React + TanStack Router/Query + Tailwind CSS
- **Tooling**: Nx, pnpm, mise, Docker Compose

## Quick Start

```bash
# Prerequisites: Docker & mise
pnpm install
cp .env.example .env   # set JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, EMAIL_VERIFICATION_SECRET

mise run up            # start Postgres, Redis, Mailhog
pnpm db:migrate        # apply schema migrations
mise run seed          # seed demo users + leave types

mise run dev           # backend (hot-reload)
pnpm nx serve manager  # frontend at http://localhost:4200
```

See [`docs/`](./docs/README.md) for full documentation.

## Features

- **Authentication** — 2-step registration with email OTP, stateful JWT, per-device sessions
- **Employee Management** — CRUD, roles (admin / hr / manager / employee), profiles, invitation flow
- **Schedule Management** — weekly calendar, shift CRUD, recurring shifts, bulk operations, copy week
- **Leave Management** — leave type configuration, per-employee balances, request/approve/reject workflow, day-count editing
- **RBAC** — `RolesGuard` enforces role-based access across all protected endpoints
- **Async Emails** — BullMQ + Redis, delivery via Nodemailer (Mailhog in dev)

## Demo Accounts (after seed)

| Email | Password | Role |
|-------|----------|------|
| `admin@hecto.dev` | `hecto123` | admin |
| `hr@hecto.dev` | `hecto123` | hr |
| `manager@hecto.dev` | `hecto123` | manager |
| `employee@hecto.dev` | `hecto123` | employee |
