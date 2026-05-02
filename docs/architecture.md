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

### Frontend

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
│   ├── backend/                          # NestJS API application
│   │   ├── src/
│   │   │   ├── main.ts                   # HTTP server entry point
│   │   │   ├── worker.ts                 # BullMQ worker entry point
│   │   │   ├── app/
│   │   │   │   ├── app.module.ts         # Root DI module
│   │   │   │   └── health.controller.ts  # GET /api/health
│   │   │   ├── seed/
│   │   │   │   └── seed.service.ts       # Database seeding
│   │   │   └── worker/
│   │   │       └── worker.module.ts      # Worker-only NestJS module
│   │   ├── Dockerfile                    # Multi-stage build (backend + worker)
│   │   └── webpack.worker.config.js      # Webpack config for worker bundle
│   │
│   └── manager/                          # React SPA (port 4200)
│       └── src/
│           ├── main.tsx                  # React entry point
│           ├── app/
│           │   ├── app.tsx               # Root component + router
│           │   └── providers.tsx         # QueryClient, Router providers
│           ├── components/layout/        # Shared layout components
│           ├── lib/
│           │   ├── api.ts                # Axios client + auth interceptor setup
│           │   └── query-client.ts       # TanStack Query configuration
│           ├── router/routes/auth/
│           │   ├── login.route.tsx       # /auth/login
│           │   └── register.route.tsx    # /auth/register + /verify + /resend
│           └── stores/
│               └── auth.store.ts         # Zustand auth state
│
├── libs/
│   ├── backend/
│   │   ├── auth/                         # @hecto/auth
│   │   │   └── src/lib/
│   │   │       ├── auth.module.ts
│   │   │       ├── auth.service.ts       # Login, register initiation, verification, refresh, logout
│   │   │       ├── auth.controller.ts    # /auth/* endpoints
│   │   │       ├── sessions.repository.ts
│   │   │       ├── email-verification.repository.ts
│   │   │       ├── guards/
│   │   │       │   └── jwt-auth.guard.ts
│   │   │       ├── decorators/
│   │   │       │   ├── current-user.decorator.ts
│   │   │       │   └── public.decorator.ts
│   │   │       └── dto/
│   │   │           ├── register.dto.ts
│   │   │           ├── login.dto.ts
│   │   │           ├── verify-email-code.dto.ts
│   │   │           └── resend-verification-code.dto.ts
│   │   │
│   │   ├── database/                     # @hecto/database
│   │   │   ├── migrations/               # SQL migration files (Drizzle Kit)
│   │   │   └── src/lib/
│   │   │       ├── database.module.ts
│   │   │       ├── database.provider.ts
│   │   │       └── schema/
│   │   │           ├── users.schema.ts
│   │   │           ├── sessions.schema.ts
│   │   │           └── email-verifications.schema.ts
│   │   │
│   │   ├── mail/                         # @hecto/mail
│   │   │   └── src/lib/
│   │   │       ├── mail.module.ts
│   │   │       ├── mail.service.ts       # sendWelcomeEmail, sendVerificationEmail
│   │   │       └── templates/
│   │   │           ├── welcome.template.ts
│   │   │           └── verification-code.template.ts
│   │   │
│   │   ├── queue/                        # @hecto/queue
│   │   │   └── src/lib/
│   │   │       ├── queue.module.ts       # BullMQ module (global)
│   │   │       ├── queue.constants.ts    # Queue name + job type constants
│   │   │       ├── tasks-queue.service.ts # Enqueue jobs
│   │   │       └── processors/
│   │   │           └── tasks.processor.ts # Process jobs (concurrency: 5)
│   │   │
│   │   └── users/                        # @hecto/users
│   │       └── src/lib/
│   │           ├── users.module.ts
│   │           ├── users.service.ts      # create, findById, findByEmail, createFromVerifiedEmail
│   │           ├── users.repository.ts
│   │           └── dto/
│   │               └── create-user.dto.ts
│   │
│   └── shared/
│       ├── api-client/                   # @hecto/api-client
│       │   └── src/lib/
│       │       ├── http-client.ts        # Axios factory
│       │       ├── auth-interceptors.ts  # Token refresh + error passthrough
│       │       └── api-error.ts          # getApiError() helper
│       │
│       ├── schemas/                      # @hecto/schemas
│       │   └── src/lib/
│       │       ├── auth.schema.ts        # loginSchema, registerSchema (Zod)
│       │       └── user.schema.ts
│       │
│       ├── types/                        # @hecto/shared-types
│       │   └── src/lib/
│       │       ├── auth.types.ts         # AccessTokenPayload, RefreshTokenPayload, LoginResponse, etc.
│       │       └── user.types.ts         # UserPublic, SessionInfo
│       │
│       └── ui/                           # @hecto/ui
│           └── src/lib/
│               ├── button.tsx
│               ├── input.tsx
│               ├── form-field.tsx
│               ├── alert.tsx
│               ├── card.tsx
│               └── ...                   # More Tailwind-based components
│
├── docs/                                 # Documentation
├── docker-compose.yml                    # All services: postgres, redis, mailhog, backend, worker
├── drizzle.config.ts                     # Drizzle Kit config (schema path, migrations output)
├── mise.toml                             # Tool versions and task shortcuts
├── nx.json                               # Nx workspace config
├── tsconfig.base.json                    # Base TypeScript config + @hecto/* paths
├── pnpm-workspace.yaml                   # pnpm monorepo setup
└── package.json                          # Root workspace dependencies
```

## Library Dependency Graph

```
@hecto/shared-types          (no local deps)
@hecto/schemas               (no local deps)
       ↑                            ↑
@hecto/api-client            @hecto/shared-types
       ↑
@hecto/ui                    (no local deps)
       ↑
apps/manager ──── @hecto/api-client, @hecto/schemas, @hecto/shared-types, @hecto/ui

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
apps/backend   ──── @hecto/auth, @hecto/database, @hecto/queue
```

All cross-package imports use the `@hecto/*` namespace. TypeScript resolves them via `paths` in `tsconfig.base.json` directly to source `.ts` files. Webpack resolves them via `resolve.alias`. Nx manages TypeScript project references via `nx sync`.

## Authentication Architecture

Authentication is implemented in `@hecto/auth` and uses stateful JWT with server-side session tracking. Registration requires email verification before an account is created.

### Token Strategy

| Token | Storage | Lifetime | Purpose |
|-------|---------|---------|---------|
| Access token | `HttpOnly` cookie (`access_token`) + response body | `JWT_ACCESS_EXPIRY` (default: `15m`) | Authorise API requests |
| Refresh token | `HttpOnly` cookie (`refresh_token`) + response body | `JWT_REFRESH_EXPIRY` (default: `7d`) | Obtain new access tokens |

Both tokens are signed JWTs with separate secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`).

### Registration Flow (2-step with Email Verification)

```
Client                       AuthController            AuthService              DB / Queue
  │                               │                         │                       │
  │  POST /api/auth/register      │                         │                       │
  │  { email, password, name }    │                         │                       │
  │ ─────────────────────────────►│                         │                       │
  │                               │  initiateRegistration() │                       │
  │                               │ ───────────────────────►│                       │
  │                               │                         │  check email exists   │
  │                               │                         │ ─────────────────────►│
  │                               │                         │  hash password (argon2id)
  │                               │                         │  generate 6-digit OTP │
  │                               │                         │  HMAC-SHA256(OTP)     │
  │                               │                         │  store email_verifications row
  │                               │                         │ ─────────────────────►│
  │                               │                         │  enqueue email job    │
  │                               │                         │ ─────────────────────►│ (Redis/BullMQ)
  │  202 { maskedEmail, expiresAt }│                         │                       │
  │ ◄─────────────────────────────│                         │                       │
  │                               │                         │                       │
  │  [user receives email with code]                        │                       │
  │                               │                         │                       │
  │  POST /api/auth/register/verify│                        │                       │
  │  { email, code: "123456" }    │                         │                       │
  │ ─────────────────────────────►│                         │                       │
  │                               │  verifyEmailCode()      │                       │
  │                               │ ───────────────────────►│                       │
  │                               │                         │  lookup verification  │
  │                               │                         │  timing-safe compare  │
  │                               │                         │  create user account  │
  │                               │                         │  create session       │
  │                               │                         │  sign tokens          │
  │                               │                         │  delete verification  │
  │  201 { user, accessToken, refreshToken }                │                       │
  │ ◄─────────────────────────────│                         │                       │
```

**Resend flow**: `POST /api/auth/register/resend-code` regenerates the OTP (up to 3 times, with 30-second cooldown). A new HMAC is stored and the old code is invalidated.

### Login Flow

```
Client                        AuthController          AuthService              DB
  │                                │                       │                    │
  │  POST /api/auth/login          │                       │                    │
  │  { email, password }           │                       │                    │
  │ ─────────────────────────────► │                       │                    │
  │                                │  login(dto, req, res) │                    │
  │                                │ ─────────────────────►│                    │
  │                                │                       │  validateCredentials│
  │                                │                       │ ──────────────────►│
  │                                │                       │  (argon2id verify) │
  │                                │                       │ ◄──────────────────│
  │                                │                       │  sessionsRepo.create│
  │                                │                       │ ──────────────────►│
  │                                │                       │  sign access+refresh│
  │                                │                       │  set cookies       │
  │  200 { user, accessToken, refreshToken }               │                    │
  │ ◄──────────────────────────────│                       │                    │
```

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | Public | Initiate registration — sends OTP email, returns `202` |
| `POST` | `/api/auth/register/verify` | Public | Submit OTP code — creates account, returns tokens |
| `POST` | `/api/auth/register/resend-code` | Public | Resend OTP (max 3×, 30 s cooldown) |
| `POST` | `/api/auth/login` | Public | Login with email + password |
| `POST` | `/api/auth/refresh` | Public | Refresh access token using cookie |
| `POST` | `/api/auth/logout` | Public | Revoke current session |
| `POST` | `/api/auth/logout-all` | Public | Revoke all sessions for user |
| `GET` | `/api/auth/sessions` | JWT | List active sessions |
| `DELETE` | `/api/auth/sessions/:id` | JWT | Revoke a specific session |

### Email Verification Security

- **OTP generation**: `crypto.randomInt(100000, 1000000)` — cryptographically secure 6-digit code
- **Storage**: Code is stored as HMAC-SHA256 keyed by `EMAIL_VERIFICATION_SECRET` — raw code never persisted
- **Comparison**: `crypto.timingSafeEqual` — prevents timing-based enumeration attacks
- **Expiry**: 10 minutes from creation (or last resend)
- **Attempt limit**: 5 wrong attempts invalidate the record, forcing a fresh registration
- **Pending data**: Password hash + profile fields stored as JSONB; account is only created on successful verification

### Session Management

Every login/verification creates a row in the `sessions` table. The `sessionId` is embedded in both JWT payloads, enabling:

- **Per-device logout** — `DELETE /api/auth/sessions/:sessionId`
- **Logout all** — `POST /api/auth/logout-all`
- **Session list** — `GET /api/auth/sessions` (device name, platform, IP, last used)
- **Token rotation** — refresh checks the session is still active before issuing a new access token

### Guards and Decorators

| Symbol | Type | Usage |
|--------|------|-------|
| `JwtAuthGuard` | Guard | Applied globally; blocks unauthenticated requests |
| `@Public()` | Decorator | Marks a route as unauthenticated (bypasses `JwtAuthGuard`) |
| `@CurrentUser()` | Param decorator | Injects `AccessTokenPayload` from `req.user` |

## Queue & Email Architecture

Email delivery is decoupled from the HTTP request cycle using BullMQ:

```
HTTP Request
    │
    ▼
AuthService
    │  tasksQueueService.sendVerificationEmail(email, code, name)
    ▼
BullMQ Queue ──► Redis
    │
    ▼  (processed by worker container)
TasksProcessor
    │  mailService.sendVerificationEmail(email, code, name)
    ▼
Nodemailer ──► SMTP (Mailhog in dev, real SMTP in prod)
```

**Worker process** (`apps/backend/src/worker.ts`): A separate Node.js process that runs only the `WorkerModule` (Queue + Mail providers). It processes jobs with concurrency 5 and retries with exponential backoff.

**Job types** (defined in `queue.constants.ts`):

| Job | Payload | Description |
|-----|---------|-------------|
| `send-welcome-email` | `{ email, firstName }` | Sent after successful registration |
| `send-verification-email` | `{ email, code, firstName }` | Sent during registration initiation and resend |

## Database Schema

Migrations live in `libs/backend/database/migrations/` and are applied with `pnpm db:migrate`.

**`users`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | Primary key, random |
| `email` | `varchar(255)` | Unique, lowercase, required |
| `username` | `varchar(150)` | Unique, optional |
| `password_hash` | `varchar(255)` | argon2id hash (memoryCost 64 MB, timeCost 3) |
| `first_name`, `last_name` | `varchar(150)` | Optional |
| `is_active` | `boolean` | Soft-disable accounts |
| `is_superuser`, `is_staff` | `boolean` | Role flags embedded in JWT payload |
| `date_joined`, `last_login` | `timestamptz` | Audit timestamps |

**`sessions`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | Primary key; embedded in JWT `sessionId` |
| `user_id` | `uuid` | FK → `users.id` (cascade delete) |
| `ip_address` | `varchar(45)` | Respects `X-Forwarded-For` |
| `user_agent` | `text` | Raw UA string |
| `device_name` | `varchar(255)` | Detected or provided by client |
| `platform` | `varchar(50)` | `web`, `mobile`, `api` |
| `is_active` | `boolean` | Revoked on logout |
| `last_used_at` | `timestamptz` | Updated on each refresh |
| `expires_at` | `timestamptz` | Enforced by refresh endpoint |

**`email_verifications`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | Primary key |
| `email` | `varchar(255)` | Indexed; one active record per email |
| `code_hash` | `varchar(64)` | HMAC-SHA256 hex of the OTP |
| `pending_data` | `jsonb` | `{ passwordHash, firstName, lastName, deviceName, ipAddress, userAgent }` |
| `resend_count` | `smallint` | Number of resends used (max 3) |
| `last_resent_at` | `timestamptz` | Used to enforce 30 s resend cooldown |
| `wrong_attempts` | `smallint` | Wrong code attempts (max 5 before invalidation) |
| `expires_at` | `timestamptz` | 10 minutes from creation or last resend |

## Frontend Architecture

The `apps/manager` app is a React SPA served by Vite on port 4200.

### Routing (TanStack Router)

```
/                    → root.route.tsx  (requires auth, redirects to /sessions)
/auth/login          → login.route.tsx
/auth/register       → register.route.tsx (handles both form + verification steps)
/sessions            → sessions.route.tsx (active sessions list)
```

### Auth Client Flow

`@hecto/api-client` ships `setupAuthInterceptors` which:
1. Attaches `Authorization: Bearer <token>` to every outgoing request (when a token is in Zustand store)
2. On a `401` response **from an authenticated request** — silently calls `/auth/refresh` and retries
3. On a `401` from an **unauthenticated request** (no token was sent) — passes the original error through unchanged (preserves correct error messages for login/register)
4. On a `401` from the refresh endpoint itself — calls `onAuthFailure()` (clears store, redirects to login)

### State Management

`useAuthStore` (Zustand with `persist`) stores:
- `user: UserPublic | null` — persisted to `localStorage` (survives page reload)
- `accessToken: string | null` — **in-memory only** (cleared on reload; refreshed silently via cookie)
- `isAuthenticated: boolean`

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

The Dockerfile produces a single image used for both the `backend` and `worker` services in Docker Compose. The `worker` service uses `CMD ["node", "worker.js"]`.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | — | Min 32 chars |
| `JWT_REFRESH_SECRET` | Yes | — | Min 32 chars |
| `EMAIL_VERIFICATION_SECRET` | Yes | — | Min 32 chars; used as HMAC key for OTP hashing |
| `JWT_ACCESS_EXPIRY` | No | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRY` | No | `7d` | Refresh token / session lifetime |
| `REDIS_HOST` | No | `redis` (Docker) / `localhost` | Redis hostname |
| `REDIS_PORT` | No | `6379` | Redis port |
| `REDIS_PASSWORD` | No | — | Set in production |
| `SMTP_PORT` | No | `1025` | SMTP port |
| `SMTP_FROM` | No | `noreply@hectohr.io` | Sender address |
| `SMTP_USER` / `SMTP_PASS` | No | — | Authenticated SMTP (production) |
| `SMTP_SECURE` | No | — | Set `true` for port 465 TLS |
| `CORS_ORIGINS` | No | `http://localhost:4200` | Comma-separated allowed origins |
| `PORT` | No | `3000` | HTTP server port |

> **Note on `SMTP_HOST`**: Do **not** set this in `.env` when using Docker Compose — `docker-compose.yml` defaults it to the `mailhog` service name. For local development without Docker, set `SMTP_HOST=localhost`.

## Design Decisions

### Why Stateful JWT (Sessions Table)?

A pure stateless JWT cannot be revoked. By storing `sessionId` in the database we can:
- Instantly revoke individual sessions (logout from one device)
- Force-logout all devices at once
- Show users their active devices for security transparency

### Why BullMQ for Emails?

Sending emails synchronously during registration would:
- Increase registration latency by 200–500 ms per email
- Block the HTTP response if the SMTP server is slow or unavailable
- Cause registration to fail entirely if the mail queue is down

BullMQ decouples delivery, provides automatic retries with exponential backoff, and keeps registration fast regardless of email latency.

### Why Hash OTP Codes?

A 6-digit code has only 10⁶ possibilities. If the database is breached, an attacker could trivially reverse-lookup stored plain codes. HMAC-SHA256 with a server-side secret (`EMAIL_VERIFICATION_SECRET`) means the code cannot be recovered without the key. Timing-safe comparison prevents side-channel attacks on the comparison itself.

### Why pnpm?

- **Faster**: Linked packages, no duplication
- **Safer**: Prevents hidden dependencies
- **Monorepo-friendly**: Built-in workspace support

### Why Nx?

- **Task caching**: Rebuild only changed projects
- **Dependency graph**: Auto-run dependent tasks
- **Scalability**: Foundation for 10+ packages

### Why SWC (dev) + Webpack (prod)?

- **Dev**: SWC is 10x faster for quick feedback
- **Prod**: Webpack tree-shakes and produces a single optimised bundle

## Troubleshooting Architecture Issues

**Q: Why does TypeScript complain about missing `@hecto/*` modules?**
A: Run `pnpm nx sync` to update TypeScript project references. The `@hecto/*` paths in `tsconfig.base.json` point directly to source `.ts` files.

**Q: How do I generate and apply a new database migration?**
A: Edit the schema in `libs/backend/database/src/lib/schema/`, run `pnpm db:generate`, then `pnpm db:migrate`.

**Q: How do I inspect the database visually?**
A: Run `pnpm db:studio` to open Drizzle Studio in your browser.

**Q: How do I view emails sent during development?**
A: Open `http://localhost:8025` — Mailhog captures all SMTP traffic and shows it in a web UI.
