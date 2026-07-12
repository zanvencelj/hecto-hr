# Architecture

This document describes the project structure, technology stack, design decisions, and how the build pipeline works.

## Technology Stack

### Backend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 22 (via mise) | JavaScript runtime |
| **Framework** | NestJS | 11 | Opinionated TypeScript server framework |
| **TypeScript** | TypeScript | 6 | Type-safe JavaScript |
| **Bundler (dev)** | SWC | 1.15+ | Fast TypeScript transpilation during development |
| **Bundler (prod)** | Webpack | 5 | Production app bundling |
| **ORM** | Drizzle ORM | latest | Type-safe SQL query builder |
| **Database** | PostgreSQL | 17 | Primary data store |
| **Queue** | BullMQ | 5 | Background job processing |
| **Cache / Queue broker** | Redis | 7 | BullMQ backend |
| **Email** | Nodemailer | 8 | SMTP email delivery |
| **Dev email** | Mailhog | latest | Local SMTP server with web UI |
| **Password hashing** | argon2 | latest | argon2id algorithm |
| **JWT** | @nestjs/jwt | latest | Token signing and verification |

### Manager Web

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | React | 19 | UI component framework |
| **Build tool** | Vite | 8 | Fast dev server and production bundler |
| **Routing** | TanStack Router | 1 | Type-safe file-based routing |
| **Data fetching** | TanStack Query | 5 | Server state management |
| **State** | Zustand | 5 | Client state management |
| **Styles** | Tailwind CSS | 4 | Utility-first CSS |
| **Validation** | Zod | 4 | Schema validation |
| **HTTP client** | Axios | 1 | API requests |

### Employee Mobile App

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | React Native | 0.85+ | Cross-platform mobile UI |
| **Platform** | Expo | 56 | Build tooling, OTA updates, native APIs |
| **Routing** | Expo Router | 56 | File-based navigation |
| **Styles** | NativeWind | 4 | Tailwind CSS for React Native |
| **Data fetching** | TanStack Query | 5 | Server state management |
| **State** | Zustand + `expo-secure-store` | 5 | Auth state with secure persistence |
| **Build** | EAS Build | — | Cloud builds for iOS and Android |

### Monorepo & Tooling

| Tool | Version | Purpose |
|------|---------|---------|
| **Nx** | 22+ | Task orchestration and caching |
| **pnpm** | 10+ (via mise) | Fast, efficient monorepo dependency management |
| **mise** | latest | Manages Node, pnpm per-project |
| **ESLint** | 10+ | Code quality and style checking |
| **Jest** | 29+ | Unit testing framework |
| **Docker Compose** | latest | Multi-container local development |

## Project Structure

```
hectohr/
├── apps/
│   ├── backend/                              # NestJS API application
│   │   ├── src/
│   │   │   ├── main.ts                       # HTTP server entry point
│   │   │   ├── worker.ts                     # BullMQ worker entry point
│   │   │   ├── app/
│   │   │   │   └── app.module.ts             # Root DI module
│   │   │   └── seed/
│   │   │       └── seed.service.ts           # Database seeding (users + leave types)
│   │   ├── Dockerfile                        # Multi-stage build (backend + worker)
│   │   └── webpack.worker.config.js          # Webpack config for worker bundle
│   │
│   ├── employee/                             # React Native + Expo (mobile)
│   │   ├── app/
│   │   │   ├── _layout.tsx                   # Root layout (auth check, fonts, providers)
│   │   │   ├── index.tsx                     # Redirect → (app) or (auth)
│   │   │   ├── profile.tsx                   # Profile + logout screen
│   │   │   ├── (auth)/
│   │   │   │   └── login.tsx                 # Login screen
│   │   │   └── (app)/
│   │   │       ├── _layout.tsx               # Bottom tab navigator
│   │   │       ├── shifts/index.tsx          # View own upcoming shifts
│   │   │       ├── leaves/index.tsx          # View balances + submit leave requests
│   │   │       ├── events/index.tsx          # Clock in/out, log work events
│   │   │       └── history/index.tsx         # Work history + event timeline
│   │   ├── src/
│   │   │   ├── components/DatePicker.tsx     # Native date picker wrapper
│   │   │   ├── lib/api.ts                    # Axios client for mobile
│   │   │   ├── services/                     # API service functions (shifts, leaves, events…)
│   │   │   └── stores/
│   │   │       ├── auth.store.ts             # Zustand + expo-secure-store persistence
│   │   │       └── preferences.store.ts      # User UI preferences (event button order)
│   │   ├── app.json                          # Expo app config
│   │   └── eas.json                          # EAS Build profiles (development, preview, production)
│   │
│   ├── visitor/                              # React Native + Expo (tablet kiosk, landscape)
│   │   ├── app/
│   │   │   ├── _layout.tsx                   # Root layout (fonts, providers, 60s idle reset)
│   │   │   ├── index.tsx                     # Home — Sign in / Sign out buttons (or → /pair)
│   │   │   ├── pair.tsx                      # Device pairing (6-digit code → device token)
│   │   │   ├── sign-in.tsx                   # Visitor form (name, purpose) + signature pad
│   │   │   └── sign-out.tsx                  # Open-visit list (10s polling) + confirm
│   │   ├── src/
│   │   │   ├── components/SignaturePad.tsx   # Signature canvas (webview native / canvas web)
│   │   │   ├── lib/api.ts                    # Axios client with device-token auth
│   │   │   ├── services/kiosk.service.ts     # /kiosk/* API calls
│   │   │   └── stores/device.store.ts        # Zustand + secure-store device token persistence
│   │   ├── app.json                          # Expo config (landscape, tablets)
│   │   └── eas.json                          # EAS Build profiles
│   │
│   └── manager/                              # React SPA (port 4200)
│       └── src/
│           ├── main.tsx                      # React entry point
│           ├── app/
│           │   ├── app.tsx                   # Root component + router
│           │   └── providers.tsx             # QueryClient, Router, ToastProvider
│           ├── components/layout/            # AppLayout shell
│           ├── components/history/           # Shared HistoryView component
│           ├── lib/
│           │   ├── api.ts                    # Axios client + auth interceptor setup
│           │   ├── date.ts                   # fmtDate / fmtDateTime helpers (dd.mm.YYYY)
│           │   └── query-client.ts           # TanStack Query configuration
│           ├── router/routes/
│           │   ├── auth/
│           │   │   ├── login.route.tsx        # /auth/login
│           │   │   ├── register.route.tsx     # /auth/register (OTP verification)
│           │   │   └── accept-invite.route.tsx# /auth/accept-invite
│           │   ├── employees/
│           │   │   ├── list.route.tsx         # /employees — employee table
│           │   │   └── detail.route.tsx       # /employees/:id — profile + edit
│           │   ├── leave/
│           │   │   ├── manager.route.tsx      # /leave — requests + balances (manager)
│           │   │   └── employee.route.tsx     # /my-leave — balances + requests (employee)
│           │   ├── schedule/
│           │   │   └── manager.route.tsx      # /schedule — weekly calendar (manager)
│           │   ├── change-requests.route.tsx  # /change-requests — event change request review
│           │   ├── visitors.route.tsx         # /visitors — live visitor list + history + signatures
│           │   ├── kiosk-devices.route.tsx    # /kiosk-devices — pair/rename/revoke kiosks (admin)
│           │   └── my-history.route.tsx       # /my-history — own work history
│           └── stores/
│               └── auth.store.ts             # Zustand auth state
│
├── libs/
│   ├── backend/
│   │   ├── auth/                             # @hecto/auth
│   │   │   └── src/lib/
│   │   │       ├── auth.module.ts
│   │   │       ├── auth.service.ts           # Login, register, verify, refresh, logout
│   │   │       ├── auth.controller.ts        # /auth/* endpoints
│   │   │       ├── guards/
│   │   │       │   ├── jwt-auth.guard.ts     # Global JWT guard (registered as APP_GUARD)
│   │   │       │   └── roles.guard.ts        # Role-based access guard
│   │   │       └── decorators/
│   │   │           ├── current-user.decorator.ts
│   │   │           ├── public.decorator.ts   # @Public() — bypasses JwtAuthGuard
│   │   │           └── roles.decorator.ts    # @Roles('admin', 'hr', ...)
│   │   │
│   │   ├── database/                         # @hecto/database
│   │   │   ├── migrations/                   # SQL migration files (Drizzle Kit)
│   │   │   └── src/lib/schema/
│   │   │       ├── users.schema.ts
│   │   │       ├── sessions.schema.ts
│   │   │       ├── email-verifications.schema.ts
│   │   │       ├── invitations.schema.ts
│   │   │       ├── employee-profiles.schema.ts
│   │   │       ├── employee-availability.schema.ts
│   │   │       ├── shifts.schema.ts
│   │   │       ├── shift-breaks.schema.ts
│   │   │       ├── recurring-shifts.schema.ts
│   │   │       ├── work-events.schema.ts
│   │   │       ├── event-change-requests.schema.ts
│   │   │       ├── push-tokens.schema.ts
│   │   │       ├── leave-types.schema.ts
│   │   │       ├── leave-balances.schema.ts
│   │   │       ├── leave-requests.schema.ts
│   │   │       ├── kiosk-devices.schema.ts
│   │   │       └── visits.schema.ts
│   │   │
│   │   ├── employees/                        # @hecto/employees
│   │   │   └── src/lib/
│   │   │       ├── employees.module.ts
│   │   │       ├── employees.service.ts      # CRUD, invite, profile management
│   │   │       ├── employees.controller.ts   # /employees endpoints
│   │   │       └── employees.repository.ts
│   │   │
│   │   ├── events/                           # @hecto/events
│   │   │   └── src/lib/
│   │   │       ├── events.module.ts
│   │   │       ├── events.service.ts         # Work event creation, history, change requests
│   │   │       ├── events.controller.ts      # /events endpoints
│   │   │       └── events.repository.ts
│   │   │
│   │   ├── leave/                            # @hecto/leave
│   │   │   └── src/lib/
│   │   │       ├── leave.module.ts
│   │   │       ├── leave.service.ts          # Leave types, balances, requests, approvals
│   │   │       ├── leave.controller.ts       # /leave endpoints
│   │   │       ├── leave.repository.ts       # DB queries with user joins
│   │   │       └── dto/
│   │   │           ├── create-leave-request.dto.ts
│   │   │           ├── review-leave-request.dto.ts
│   │   │           ├── set-leave-balance.dto.ts
│   │   │           └── edit-request-days.dto.ts
│   │   │
│   │   ├── mail/                             # @hecto/mail
│   │   │   └── src/lib/
│   │   │       ├── mail.module.ts
│   │   │       └── mail.service.ts           # sendWelcomeEmail, sendVerificationEmail, sendInviteEmail
│   │   │
│   │   ├── queue/                            # @hecto/queue
│   │   │   └── src/lib/
│   │   │       ├── queue.module.ts
│   │   │       ├── queue.constants.ts        # Queue name + job type constants
│   │   │       ├── tasks-queue.service.ts    # Enqueue jobs
│   │   │       └── processors/
│   │   │           └── tasks.processor.ts    # Process jobs (concurrency 5)
│   │   │
│   │   ├── reports/                          # @hecto/reports
│   │   │   └── src/lib/
│   │   │       ├── reports.module.ts
│   │   │       └── reports.controller.ts     # /reports endpoints (work history summaries)
│   │   │
│   │   ├── visits/                           # @hecto/visits
│   │   │   └── src/lib/
│   │   │       ├── visits.module.ts
│   │   │       ├── visits.service.ts         # Pairing, visitor sign-in/out, signatures → MinIO
│   │   │       ├── visits.controller.ts      # /visits (staff) + /kiosk-devices (admin) endpoints
│   │   │       ├── kiosk.controller.ts       # /kiosk/* endpoints (device-token auth)
│   │   │       ├── visits.repository.ts
│   │   │       ├── kiosk-devices.repository.ts
│   │   │       └── guards/
│   │   │           └── kiosk-auth.guard.ts   # Authenticates paired kiosk tablets
│   │   │
│   │   ├── shifts/                           # @hecto/shifts
│   │   │   └── src/lib/
│   │   │       ├── shifts.module.ts
│   │   │       ├── shifts.service.ts         # Shift CRUD, recurring, copy week, bulk delete
│   │   │       ├── shifts.controller.ts      # /shifts endpoints
│   │   │       └── shifts.repository.ts
│   │   │
│   │   └── users/                            # @hecto/users
│   │       └── src/lib/
│   │           ├── users.module.ts
│   │           ├── users.service.ts          # create, findById, findByEmail
│   │           ├── users.repository.ts
│   │           ├── push-tokens.controller.ts # POST/DELETE /users/push-tokens
│   │           ├── push-tokens.repository.ts
│   │           └── decorators/
│   │               └── current-user.decorator.ts
│   │
│   └── shared/
│       ├── api-client/                       # @hecto/api-client
│       │   └── src/lib/
│       │       ├── http-client.ts            # Axios factory
│       │       ├── auth-interceptors.ts      # Token refresh + error passthrough
│       │       └── api-error.ts             # getApiError() helper
│       │
│       ├── schemas/                          # @hecto/schemas
│       │   └── src/lib/
│       │       └── auth.schema.ts            # loginSchema, registerSchema (Zod)
│       │
│       ├── types/                            # @hecto/shared-types
│       │   └── src/lib/
│       │       ├── auth.types.ts             # AccessTokenPayload, LoginResponse, etc.
│       │       ├── employee.types.ts         # EmployeePublic
│       │       ├── event.types.ts            # WorkEventPublic, EventChangeRequestPublic
│       │       ├── leave.types.ts            # LeaveTypePublic, LeaveBalancePublic, LeaveRequestPublic
│       │       └── shift.types.ts            # ShiftPublic (userId nullable), ShiftBreakPublic
│       │
│       ├── ui/                               # @hecto/ui (web)
│       │   └── src/lib/
│       │       ├── button.tsx
│       │       ├── input.tsx
│       │       ├── form-field.tsx
│       │       ├── alert.tsx
│       │       ├── badge.tsx
│       │       ├── card.tsx
│       │       ├── select.tsx
│       │       ├── textarea.tsx
│       │       ├── avatar.tsx
│       │       ├── separator.tsx
│       │       ├── page-header.tsx
│       │       ├── time-picker.tsx           # Custom HH:MM segments (24h, no browser locale)
│       │       ├── date-picker.tsx           # Custom DD.MM.YYYY segments
│       │       ├── dialog.tsx                # Accessible modal
│       │       ├── toast.tsx                 # ToastProvider + useToast() hook
│       │       └── skeleton.tsx             # Loading placeholder
│       │
│       └── ui-native/                        # @hecto/ui-native (React Native)
│           └── src/lib/
│               ├── card.tsx                  # NativeWind card component
│               └── spinner.tsx               # Loading spinner
│
├── docs/
├── docker-compose.yml
├── drizzle.config.ts
├── mise.toml
├── nx.json
├── tsconfig.base.json
├── pnpm-workspace.yaml
└── package.json
```

## Library Dependency Graph

```
@hecto/shared-types          (no local deps)
@hecto/schemas               (no local deps)
@hecto/ui                    (no local deps)
@hecto/ui-native             (no local deps)
       ↑                            ↑
@hecto/api-client ──────── @hecto/shared-types

apps/manager  ──── @hecto/api-client, @hecto/schemas, @hecto/shared-types, @hecto/ui
apps/employee ──── @hecto/api-client, @hecto/schemas, @hecto/shared-types, @hecto/ui-native
apps/visitor  ──── @hecto/api-client, @hecto/schemas, @hecto/shared-types, @hecto/ui-native

@hecto/database              (no local deps)
       ↑
@hecto/users   ──── @hecto/database, @hecto/shared-types
       ↑
@hecto/mail                  (no local deps)
       ↑
@hecto/queue   ──── @hecto/mail
       ↑
@hecto/auth    ──── @hecto/database, @hecto/users, @hecto/queue, @hecto/shared-types
       ↑
@hecto/employees ── @hecto/database, @hecto/shared-types
@hecto/shifts    ── @hecto/database, @hecto/shared-types
@hecto/leave     ── @hecto/database, @hecto/shared-types
@hecto/events    ── @hecto/database, @hecto/shared-types
@hecto/visits    ── @hecto/database, @hecto/auth, @hecto/storage, @hecto/shared-types
@hecto/reports   ── @hecto/database, @hecto/shifts, @hecto/events
       ↑
apps/backend ──── @hecto/auth, @hecto/database, @hecto/employees, @hecto/events,
                  @hecto/leave, @hecto/queue, @hecto/reports, @hecto/shifts, @hecto/users,
                  @hecto/visits
```

## Authentication & RBAC Architecture

### Roles

Every `users` row has a `role` column (`admin`, `hr`, `manager`, `employee`). The role is embedded in the JWT access token payload and enforced by `RolesGuard`.

```
admin    — full access to all endpoints
hr       — same as admin for employee and leave management
manager  — manage schedules, review leave requests, view employees
employee — request leave, view own schedule and balances
```

### Token Strategy

| Token | Storage | Lifetime | Purpose |
|-------|---------|---------|---------|
| Access token | `HttpOnly` cookie + response body | `JWT_ACCESS_EXPIRY` (default `15m`) | Authorise API requests |
| Refresh token | `HttpOnly` cookie + response body | `JWT_REFRESH_EXPIRY` (default `7d`) | Obtain new access tokens |

### Registration Flow (2-step with Email Verification)

```
Client                       AuthController            AuthService              DB / Queue
  │  POST /auth/register      │                         │                       │
  │  { email, password, name }│ ─────────────────────── initiateRegistration() ►│
  │                           │                         │  hash password        │
  │                           │                         │  generate 6-digit OTP │
  │                           │                         │  store HMAC(OTP) + pending data
  │                           │                         │  enqueue email job ───►│ (Redis)
  │  202 { maskedEmail, expiresAt }◄───────────────────  │                       │
  │                           │                         │                       │
  │  POST /auth/register/verify│                        │                       │
  │  { email, code }          │ ─────────────────────── verifyEmailCode() ──────►│
  │                           │                         │  timing-safe compare  │
  │                           │                         │  create user + session│
  │  201 { user, tokens }◄────│                         │                       │
```

### Invite Flow

Managers and HR can invite new employees without requiring self-registration:

```
POST /employees/invite  →  create invitation record  →  enqueue invite email
                                                             │
                        ◄── employee opens link → POST /auth/accept-invite
                                                  set password, activate account
```

### Guards and Decorators

`JwtAuthGuard` is registered as `APP_GUARD` in `AppModule` — all routes are protected by default. Individual routes opt out with `@Public()`.

| Symbol | Type | Usage |
|--------|------|-------|
| `JwtAuthGuard` | Guard | `APP_GUARD` — globally blocks unauthenticated requests |
| `RolesGuard` | Guard | `APP_GUARD` — enforces `@Roles()` on protected routes |
| `@Public()` | Decorator | Opts out of `JwtAuthGuard` (login, register, health check) |
| `@Roles(...roles)` | Decorator | Restricts route to listed roles |
| `@CurrentUser()` | Param decorator | Injects `AccessTokenPayload` from `req.user` |

## API Endpoints

### Authentication — `/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | Public | Initiate registration — sends OTP email |
| `POST` | `/auth/register/verify` | Public | Submit OTP — creates account, returns tokens |
| `POST` | `/auth/register/resend-code` | Public | Resend OTP (max 3×, 30 s cooldown) |
| `POST` | `/auth/login` | Public | Login with email + password |
| `POST` | `/auth/accept-invite` | Public | Accept invitation, set password |
| `POST` | `/auth/refresh` | Public | Refresh access token using cookie |
| `POST` | `/auth/logout` | JWT | Revoke current session |
| `POST` | `/auth/logout-all` | JWT | Revoke all sessions |
| `GET` | `/auth/sessions` | JWT | List active sessions |
| `DELETE` | `/auth/sessions/:id` | JWT | Revoke a specific session |

### Employees — `/employees`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/employees` | JWT | List employees in organisation |
| `GET` | `/employees/:id` | JWT | Get employee profile |
| `PATCH` | `/employees/:id` | admin/hr/manager | Update employee profile |
| `POST` | `/employees/invite` | admin/hr/manager | Send invitation email |

### Shifts — `/shifts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/shifts` | JWT | List shifts (`?from=&to=&userId=`) |
| `POST` | `/shifts` | admin/hr/manager | Create shift (optionally recurring) |
| `PATCH` | `/shifts/:id` | admin/hr/manager | Update shift |
| `DELETE` | `/shifts/:id` | admin/hr/manager | Delete shift |
| `DELETE` | `/shifts/user/:userId` | admin/hr/manager | Bulk delete (`?future=true` for future only) |

### Leave — `/leave`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/leave/types` | JWT | List leave types for organisation |
| `GET` | `/leave/balances/org` | admin/hr/manager | All employee balances (`?year=`) |
| `GET` | `/leave/balances/employee/:userId` | JWT | Employee balances (own or manager) |
| `POST` | `/leave/balances` | admin/hr/manager | Set leave quota for employee |
| `GET` | `/leave/requests/org` | admin/hr/manager | All requests (`?status=pending`) |
| `GET` | `/leave/requests/employee/:userId` | JWT | Employee's own requests |
| `POST` | `/leave/requests` | JWT | Submit leave request |
| `PATCH` | `/leave/requests/:id/review` | admin/hr/manager | Approve or reject request |
| `PATCH` | `/leave/requests/:id/days` | admin/hr/manager | Edit actual days taken |
| `DELETE` | `/leave/requests/:id` | JWT | Cancel request |

### Work Events — `/events`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/events/me` | JWT | Get own events (paginated) |
| `POST` | `/events` | JWT | Log a new work event |
| `GET` | `/events/employee/:userId` | admin/hr/manager | Get events for a specific employee |
| `GET` | `/events/change-requests` | admin/hr/manager | List all pending change requests |
| `POST` | `/events/change-requests` | JWT | Submit event change request |
| `PATCH` | `/events/change-requests/:id/review` | admin/hr/manager | Approve or reject a change request |

### Push Tokens — `/users/push-tokens`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/users/push-tokens` | JWT | Register a push notification token |
| `DELETE` | `/users/push-tokens` | JWT | Remove a push notification token |

### Reports — `/reports`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/reports/my/summary` | JWT | Own work summary (hours, events) |
| `GET` | `/reports/employee/:userId/summary` | admin/hr/manager | Employee work summary |

## Database Schema

Migrations live in `libs/backend/database/migrations/` and are applied with `pnpm db:migrate`.

### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `email` | `varchar(255)` | Unique |
| `username` | `varchar(150)` | Unique, optional |
| `password_hash` | `varchar(255)` | argon2id |
| `first_name`, `last_name` | `varchar(150)` | Optional |
| `role` | `enum` | `admin`, `hr`, `manager`, `employee` |
| `organization_id` | `uuid` | FK → `organizations` |
| `is_active` | `boolean` | Soft-disable |
| `date_joined`, `last_login` | `timestamptz` | Audit |

### `employee_profiles`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `users` (cascade) |
| `organization_id` | `uuid` | FK → `organizations` |
| `position`, `department` | `varchar` | Optional |
| `phone` | `varchar(50)` | Optional |
| `hire_date` | `date` | Optional |
| `notes` | `text` | Optional |

### `shifts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `users` (nullable — open/unassigned shifts) |
| `organization_id` | `uuid` | FK → `organizations` |
| `date` | `date` | Shift date |
| `start_time`, `end_time` | `time` | `HH:MM:SS` format |
| `notes` | `text` | Optional |
| `is_open` | `boolean` | `true` if shift has no assigned employee |
| `recurring_shift_id` | `uuid` | FK → `recurring_shifts` (nullable) |

### `shift_breaks`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `shift_id` | `uuid` | FK → `shifts` (cascade) |
| `start_time`, `end_time` | `time` | Optional — null for fixed-duration breaks |
| `duration_minutes` | `integer` | Optional |
| `is_fixed` | `boolean` | Fixed duration vs. timed break |
| `is_paid` | `boolean` | |

### `recurring_shifts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `users` |
| `organization_id` | `uuid` | FK → `organizations` |
| `days_of_week` | `integer[]` | 0=Sun … 6=Sat |
| `start_time`, `end_time` | `time` | |
| `start_date` | `date` | Recurrence start |
| `end_date` | `date` | Optional recurrence end |
| `is_active` | `boolean` | |

### `leave_types`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `organization_id` | `uuid` | FK → `organizations` (null for system types) |
| `name` | `varchar(100)` | Display name |
| `code` | `varchar(20)` | Short code (e.g. `SICK`) |
| `color` | `varchar(7)` | Hex color for calendar display |
| `default_days_per_year` | `integer` | Suggested quota |
| `is_paid` | `boolean` | |
| `is_active` | `boolean` | |

### `leave_balances`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `users` |
| `organization_id` | `uuid` | FK → `organizations` |
| `leave_type_id` | `uuid` | FK → `leave_types` |
| `year` | `integer` | Calendar year |
| `total_days` | `numeric(5,1)` | Quota (`0` = no limit set / tracks usage only) |
| `used_days` | `numeric(5,1)` | Approved days consumed |
| `pending_days` | `numeric(5,1)` | Pending approval |

> A balance row is upserted on first request or quota assignment. `total_days = 0` means no quota is set (treated as unlimited in the API — returned as `null` in `LeaveBalancePublic.totalDays`).

### `leave_requests`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `users` (the employee) |
| `organization_id` | `uuid` | FK → `organizations` |
| `leave_type_id` | `uuid` | FK → `leave_types` |
| `start_date`, `end_date` | `date` | Inclusive range |
| `total_days` | `numeric(5,1)` | Computed weekdays; editable by managers |
| `status` | `enum` | `pending`, `approved`, `rejected`, `cancelled` |
| `requested_by_user_id` | `uuid` | FK → `users` (submitter; may differ from employee for manual entry) |
| `reviewed_by_user_id` | `uuid` | FK → `users` (nullable) |
| `reviewed_at` | `timestamptz` | Nullable |
| `is_manual_entry` | `boolean` | Manager-created entries are auto-approved |
| `is_edited` | `boolean` | Set when `total_days` is updated post-submission |
| `edited_by_user_id` | `uuid` | FK → `users` (nullable) |
| `edited_at` | `timestamptz` | Nullable |
| `notes` | `text` | Employee notes |
| `review_notes` | `text` | Manager review notes |

### `employee_availability`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `users` (cascade) |
| `organization_id` | `uuid` | FK → `organizations` |
| `day_of_week` | `integer` | 0=Sun … 6=Sat |
| `is_available` | `boolean` | Whether available that day |
| `time_from`, `time_to` | `time` | Optional availability window |
| `created_at`, `updated_at` | `timestamptz` | |

Unique constraint on `(user_id, day_of_week)`.

### `work_events`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `users` (cascade) |
| `organization_id` | `uuid` | FK → `organizations` |
| `type` | `enum` | `arrival`, `departure`, `break_start`, `break_end`, `remote_arrival`, `business_trip_start`, `business_trip_end` |
| `notes` | `text` | Optional |
| `occurred_at` | `timestamptz` | When the event happened (default: now) |
| `created_at` | `timestamptz` | When the record was inserted |

### `event_change_requests`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `users` (requester, cascade) |
| `organization_id` | `uuid` | FK → `organizations` |
| `request_type` | `enum` | `add`, `edit`, `delete` |
| `event_id` | `uuid` | FK → `work_events` (nullable, set null on delete) |
| `requested_type` | `work_event_type` | Proposed event type (for add/edit) |
| `requested_occurred_at` | `timestamptz` | Proposed timestamp |
| `requested_notes` | `text` | Proposed notes |
| `reason` | `text` | Why the change is needed |
| `status` | `enum` | `pending`, `approved`, `rejected` |
| `reviewed_by_user_id` | `uuid` | FK → `users` (nullable) |
| `reviewed_at` | `timestamptz` | Nullable |
| `review_notes` | `text` | Manager review notes |
| `created_at` | `timestamptz` | |

### `push_tokens`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `users` (cascade) |
| `token` | `varchar(512)` | Expo push token |
| `created_at`, `updated_at` | `timestamptz` | |

Unique constraint on `(user_id, token)`.

### `invitations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `email` | `varchar(255)` | Invitee email |
| `organization_id` | `uuid` | FK → `organizations` |
| `invited_by_user_id` | `uuid` | FK → `users` |
| `token` | `varchar` | Secure random token for accept link |
| `role` | `enum` | Role assigned on acceptance |
| `expires_at` | `timestamptz` | |
| `accepted_at` | `timestamptz` | Nullable |

## Frontend Architecture

### Routing (TanStack Router) — Manager Web

```
/                       → redirect based on role
/auth/login             → login form
/auth/register          → registration + OTP verification
/auth/accept-invite     → accept invitation, set password
/employees              → employee list (admin/hr/manager)
/employees/:id          → employee profile + edit form
/schedule               → weekly shift calendar (admin/hr/manager)
/leave                  → manager leave: requests + balance grid (admin/hr/manager)
/my-leave               → employee leave: balances + request form
/my-history             → own work history + event timeline (all roles)
/change-requests        → event change request review (admin/hr/manager)
/sessions               → active session management
```

### Routing (Expo Router) — Employee Mobile

```
/                       → redirect → (app) or (auth)/login
/(auth)/login           → login screen
/(app)/_layout          → bottom tab navigator
/(app)/shifts           → upcoming shifts
/(app)/leaves           → leave balances + submit request
/(app)/events           → clock in/out (work event logger)
/(app)/history          → work history timeline
/profile                → profile + logout
```

### Date & Time Formatting

All dates display as `dd.mm.YYYY` (independent of browser locale). Time is 24h format. Both use custom segment-based input components:

- **`<DatePicker>`** — three `<input type="number">` segments (DD / MM / YYYY), auto-advances, arrow key increment, emits `YYYY-MM-DD` ISO string
- **`<TimePicker>`** — two `<input type="number">` segments (HH / MM), 24h, auto-advances, emits `HH:MM` string

Helper functions in `apps/manager/src/lib/date.ts`:

| Function | Output |
|----------|--------|
| `fmtDate(value)` | `dd.mm.YYYY` |
| `fmtDateTime(value)` | `dd.mm.YYYY HH:MM` |
| `fmtDateShort(value)` | `dd.mm` |
| `fmtDateWithWeekday(value)` | `Mon, dd.mm.YYYY` |

### Schedule Manager UI

The weekly calendar (`/schedule`) renders an `employees × dates` table:

- **Hover cell** → `+` button opens shift create modal pre-filled with employee + date
- **Click shift chip** → edit modal (PATCH the shift)
- **Employee row kebab** → "Delete future shifts" / "Delete all shifts" with inline confirmation
- **Recurring shifts** — create form has checkbox → day-of-week selector + optional end date
- **Copy week →** — duplicates all shifts in current view to next week
- **Employee filter** — text input filters the employee rows
- **Today highlight** — current date column has indigo background
- **Color coding** — shift chip color reflects duration (gray < 6h, indigo 6–9h, amber > 9h)
- **Total hrs** — rightmost column shows weekly hour sum per employee

### Leave Manager UI

The leave page (`/leave`) has two tabs:

**Requests tab**
- Filter bar: `pending / approved / rejected / all`
- Cards show: leave type + color, status badge, employee name, date range with editable day count (pencil icon), balance snapshot (used / pending / total or ∞), optional notes, `Edited` badge
- Managers can inline-edit `total_days` on any request (pencil → input → ✓) which adjusts the employee's balance delta immediately
- Pending requests show approve/reject buttons with optional review notes input

**Balances tab**
- `employees × leave types` grid
- Each cell shows `{used}d +{pending}p / {total}d` (or `∞` if no quota)
- Click any cell → inline input to set quota, Enter to save

### Auth Client Flow

`@hecto/api-client` ships `setupAuthInterceptors` which:
1. Attaches `Authorization: Bearer <token>` to every outgoing request
2. On `401` from an authenticated request — silently calls `/auth/refresh` and retries
3. On `401` from an unauthenticated request — passes the error through unchanged
4. On `401` from the refresh endpoint itself — clears auth store and redirects to login

### State Management

`useAuthStore` (Zustand with `persist`) stores:
- `user: UserPublic | null` — persisted to `localStorage`
- `accessToken: string | null` — in-memory only (refreshed silently via cookie on reload)
- `isAuthenticated: boolean`

## Queue & Email Architecture

```
HTTP Request
    │
    ▼
AuthService / EmployeesService
    │  tasksQueueService.enqueue(job)
    ▼
BullMQ Queue ──► Redis
    │
    ▼  (processed by worker container)
TasksProcessor
    │  mailService.send*(...)
    ▼
Nodemailer ──► SMTP (Mailhog in dev, real SMTP in prod)
```

**Job types**

| Job | Payload | Description |
|-----|---------|-------------|
| `send-welcome-email` | `{ email, firstName }` | After successful registration |
| `send-verification-email` | `{ email, code, firstName }` | Registration OTP |
| `send-invite-email` | `{ email, inviterName, token }` | Employee invitation |

## Leave Balance Logic

Balance rows are upserted lazily (created on first request or quota assignment). The `adjustUsedDays` helper atomically reads and updates `used_days` + `pending_days`:

- **Submit request** → `+pendingDays`
- **Approve request** → `+usedDays`, `-pendingDays`
- **Reject request** → `-pendingDays`
- **Cancel pending** → `-pendingDays`
- **Cancel approved** → `-usedDays`
- **Edit days (any status)** → `±delta` to `usedDays` (approved) or `pendingDays` (pending)

`total_days = 0` is the sentinel for "no quota set". The API maps this to `null` in `LeaveBalancePublic.totalDays` so the frontend can display ∞.

`getBalancesForEmployee` always returns one entry per active leave type — if no DB record exists a virtual balance is synthesised (`totalDays: null, usedDays: 0, pendingDays: 0`).

## Build Pipeline

### Development

```
Backend:   node --watch + @swc-node/register → ~200ms reload
Frontend:  Vite dev server                   → ~50ms HMR
Worker:    node --watch + @swc-node/register → ~200ms reload
```

### Production: Docker Build

```
Stage 1 (deps):    pnpm install --frozen-lockfile
Stage 2 (builder): nx build backend (Webpack → main.js + worker.js)
Stage 3 (runner):  Alpine + prod deps + main.js + worker.js
```

The Dockerfile produces a single image for both `backend` and `worker` services. The worker service uses `CMD ["node", "worker.js"]`.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | — | Min 32 chars |
| `JWT_REFRESH_SECRET` | Yes | — | Min 32 chars |
| `EMAIL_VERIFICATION_SECRET` | Yes | — | Min 32 chars; HMAC key for OTP hashing |
| `JWT_ACCESS_EXPIRY` | No | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRY` | No | `7d` | Refresh token / session lifetime |
| `REDIS_HOST` | No | `redis` | Redis hostname |
| `REDIS_PORT` | No | `6379` | Redis port |
| `REDIS_PASSWORD` | No | — | Set in production |
| `SMTP_PORT` | No | `1025` | SMTP port |
| `SMTP_FROM` | No | `noreply@hectohr.io` | Sender address |
| `SMTP_USER` / `SMTP_PASS` | No | — | Authenticated SMTP (production) |
| `SMTP_SECURE` | No | — | `true` for port 465 TLS |
| `CORS_ORIGINS` | No | `http://localhost:4200` | Comma-separated allowed origins |
| `PORT` | No | `3000` | HTTP server port |

> **Note on `SMTP_HOST`**: Do not set this in `.env` when using Docker Compose — `docker-compose.yml` defaults it to the `mailhog` service name. For local dev without Docker, set `SMTP_HOST=localhost`.

## Design Decisions

### Why Stateful JWT (Sessions Table)?

A pure stateless JWT cannot be revoked. Storing `sessionId` in the database enables per-device logout, force-logout-all, and a visible active-sessions list for security transparency.

### Why BullMQ for Emails?

Sending emails synchronously during registration blocks the HTTP response if SMTP is slow and causes registration to fail if the mail server is down. BullMQ decouples delivery, provides automatic retries with exponential backoff, and keeps registration fast.

### Why Hash OTP Codes?

A 6-digit code has only 10⁶ possibilities. Storing raw codes risks brute-force or breach-based recovery. HMAC-SHA256 with a server-side secret means the code cannot be recovered without the key. Timing-safe comparison prevents side-channel attacks.

### Why Custom DatePicker / TimePicker?

`<input type="date">` and `<input type="time">` render in the browser's locale (12h format, locale-specific date order). Building custom segment inputs (separate `<input type="number">` for each field) gives full control over display format (`dd.mm.YYYY`, 24h time) on all browsers.

### Why `total_days = 0` as Sentinel for No Quota?

A `NULL` `total_days` would require either a nullable column with special handling in every query or a separate `has_quota` flag. Using `0` as a sentinel keeps the column `NOT NULL`, works with Drizzle's numeric type, and is easy to interpret: `0 → no limit set`, `> 0 → quota`. The API translates this to `null` in the public DTO so clients only see a clean nullable number.

### Why pnpm + Nx?

- **pnpm**: linked packages, no duplication, safer hidden-dependency prevention
- **Nx**: task caching means only changed projects rebuild; the dependency graph runs tasks in the correct order

### Why SWC (dev) + Webpack (prod)?

SWC is ~10× faster than the TypeScript compiler for development feedback. Webpack tree-shakes and produces a single optimised bundle for production.

## Troubleshooting Architecture Issues

**Q: TypeScript complains about missing `@hecto/*` modules?**
A: Run `pnpm nx sync` to update TypeScript project references.

**Q: How do I generate and apply a new database migration?**
A: Edit a schema file in `libs/backend/database/src/lib/schema/`, run `pnpm db:generate`, then `pnpm db:migrate`.

**Q: How do I inspect the database visually?**
A: Run `pnpm db:studio` to open Drizzle Studio.

**Q: How do I view emails sent during development?**
A: Open `http://localhost:8025` — Mailhog captures all SMTP traffic.

**Q: How do I add a new leave type?**
A: In the future a UI will exist for this. Currently: insert a row into `leave_types` with the desired `organization_id`, or update `seed.service.ts` and re-run `pnpm seed`.
