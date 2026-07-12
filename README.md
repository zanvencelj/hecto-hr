# Hectohr

A full-stack HR management system built as an Nx monorepo. Covers employee management, shift scheduling, and leave tracking with a role-based permission model.

## Stack

- **Backend**: NestJS + Drizzle ORM + PostgreSQL + BullMQ (Redis)
- **Manager Web**: React + TanStack Router/Query + Tailwind CSS
- **Employee Mobile**: React Native + Expo + NativeWind
- **Tooling**: Nx, pnpm, mise, Docker Compose

## Quick Start

```bash
# Prerequisites: Docker & mise
pnpm install
cp .env.example .env   # set JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, EMAIL_VERIFICATION_SECRET

mise run up            # start Postgres, Redis, Mailhog
pnpm db:migrate        # apply schema migrations
pnpm seed              # seed demo users + leave types

pnpm dev:backend       # backend (hot-reload)
pnpm dev:manager       # manager frontend at http://localhost:4200
pnpm mobile            # employee mobile app (Expo)
```

See [`docs/`](./docs/README.md) for full documentation.

## Features

- **Authentication** — 2-step registration with email OTP, stateful JWT, per-device sessions
- **Employee Management** — CRUD, roles (admin / hr / manager / employee), profiles, invitation flow
- **Schedule Management** — weekly calendar, shift CRUD, recurring shifts, bulk operations, copy week; open (unassigned) shifts
- **Leave Management** — leave type configuration, per-employee balances, request/approve/reject workflow, day-count editing
- **Work Events** — employees clock in/out and log events (arrival, departure, break, remote, business trip) from the mobile app
- **Event Change Requests** — employees submit corrections to events; managers approve/reject from `/change-requests`
- **Employee Mobile App** — Expo app with shifts, leaves, work events, and history tabs; push token registration
- **RBAC** — `JwtAuthGuard` global guard + `RolesGuard` enforces role-based access across all endpoints
- **Async Emails** — BullMQ + Redis, delivery via Nodemailer (Mailhog in dev)

## Demo Accounts (after seed)

| Email | Password | Role |
|-------|----------|------|
| `admin@hecto.dev` | `hecto123` | admin |
| `hr@hecto.dev` | `hecto123` | hr |
| `manager@hecto.dev` | `hecto123` | manager |
| `employee@hecto.dev` | `hecto123` | employee |
