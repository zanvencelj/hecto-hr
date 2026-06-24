# Development Guide

This guide covers daily development workflows, hot-reload mechanics, debugging, and best practices for working with Hectohr.

## Daily Workflow

### Starting Development

**Terminal 1 - Infrastructure (Postgres, Redis, Mailhog)**:
```bash
mise run up
```

**Terminal 2 - Backend (auto-restart on file changes)**:
```bash
pnpm dev:backend
```

Or via Nx directly:
```bash
pnpm nx run backend:serve
```

This starts the backend with:
- Node.js `--watch` flag (detects file changes)
- `@swc-node/register` (transpiles TypeScript on-the-fly)
- `SWCRC=true` (enables decorator support in SWC)

**Terminal 3 - Manager Frontend**:
```bash
pnpm dev:manager
```

The React app is available at `http://localhost:4200`. Vite provides instant hot-module replacement (HMR) — UI changes appear in the browser without a full reload.

**Terminal 4 - Worker (background job processor)**:

In Docker Compose the worker starts automatically alongside the backend. For local development without Docker, start it in a separate terminal:
```bash
pnpm dev:worker
```

The worker connects to Redis and processes BullMQ jobs (email sending). Without the worker running, registration emails won't be delivered.

**Terminal 5 - Mobile App (optional)**:
```bash
pnpm mobile
```

Starts the Expo Metro bundler. Press `a` for Android, `i` for iOS, or scan the QR code with Expo Go on a physical device. Requires a running backend (Terminal 2).

**Terminal 6 - Optional: Backend tests in watch mode**:
```bash
pnpm nx test backend --watch
```

### Making Changes

Edit any file in `apps/backend/src/`:

```bash
# Example: Update message in app.service.ts
apps/backend/src/app/app.service.ts
```

Before:
```typescript
getData() {
  return { message: 'Hello API' };
}
```

After:
```typescript
getData() {
  return { message: 'Hello Hectohr' };
}
```

**What happens**:
1. Save the file
2. Node.js `--watch` detects the change (~50ms)
3. `@swc-node/register` transpiles the new code
4. NestJS hot-reloads the module
5. Response updated (within ~200–300ms total)

Test via curl:
```bash
curl http://localhost:3000/api
# {"message":"Hello Hectohr"}
```

## Hot-Reload Mechanics

### How It Works

The dev setup uses **lightweight in-process reloading**, not webpack rebuilding:

```
File Change
    ↓
Node --watch detects
    ↓
@swc-node/register transpiles (Rust-based, fast)
    ↓
NestJS DI container reloads modules
    ↓
Server ready (~200-300ms)
```

**Why it's fast**:
- SWC transpiler: ~10x faster than TypeScript compiler
- No bundling step (direct CommonJS execution)
- No webpack reconstruction
- Node's native `--watch` (no extra dependency)

### What Reloads

✅ **Reloaded on save**:
- Service logic
- Decorators (`@Module`, `@Controller`, `@Injectable`)
- Configuration changes

❌ **Not reloaded** (restart required):
- Changes to decorator parameters that affect DI (e.g., new module imports)
- Environment variables (if not injected via ConfigService)
- Breaking changes to type signatures

If a change doesn't hot-reload automatically, restart manually:
```bash
# Kill the dev process (Ctrl+C) and restart
pnpm dev:backend
```

## Viewing Emails in Development

All emails sent by the backend or worker are captured by Mailhog. Open the web UI to inspect them:

```
http://localhost:8025
```

This includes:
- **Registration verification codes** — the 6-digit OTP sent when a user registers
- **Welcome emails** — sent after a verified account is created

> **SMTP_HOST in Docker**: Never set `SMTP_HOST=localhost` in `.env`. Inside the Docker network, `localhost` is the container itself, not Mailhog. The `docker-compose.yml` defaults `SMTP_HOST` to `mailhog` automatically. Only set `SMTP_HOST=localhost` if running the backend locally without Docker.

## Database Workflow

### Generate a Migration

After editing a schema file in `libs/backend/database/src/lib/schema/`:

```bash
pnpm db:generate
```

This creates a new timestamped SQL file in `libs/backend/database/migrations/`. Review it before applying.

### Apply Migrations

```bash
pnpm db:migrate
```

Run this after `pnpm db:generate` and every time you pull changes that include new migrations.

### Browse the Database Visually

```bash
pnpm db:studio
```

Opens Drizzle Studio at `https://local.drizzle.studio`. Shows all tables, rows, and lets you run queries interactively.

### Push Schema Directly (Dev Only)

```bash
pnpm db:push
```

Pushes schema changes directly to the database without creating migration files. Useful for fast iteration during early development. **Do not use in production** — changes won't be tracked or reproducible.

### Seed the Database

```bash
pnpm seed
```

Inserts sample users (password `hecto123`) and default leave types (Sick Leave, Holiday Leave). Run this after a fresh migration or after resetting the database.

## File Structure for Development

```
apps/
├── backend/
│   ├── src/
│   │   ├── main.ts                    # HTTP server bootstrap
│   │   ├── worker.ts                  # BullMQ worker bootstrap
│   │   ├── seed/                      # Database seeding
│   │   └── app/
│   │       ├── app.module.ts          # Root module (imports all libs)
│   │       ├── app.controller.ts      # Root HTTP endpoints
│   │       └── health.controller.ts   # /api/health (used by Docker healthcheck)
│   ├── Dockerfile                     # Multi-stage build (backend + worker)
│   ├── .swcrc                         # SWC config (decorators, CommonJS)
│   └── jest.config.ts                 # Jest config
└── manager/
    └── src/
        ├── main.tsx                   # React entry point
        ├── router/
        │   └── routes/
        │       └── auth/
        │           ├── login.route.tsx
        │           └── register.route.tsx  # Two-step registration + OTP
        └── stores/                    # Zustand state

libs/
├── backend/
│   ├── auth/                          # JWT, sessions, email verification OTP
│   ├── database/                      # Drizzle ORM schema + migrations
│   ├── mail/                          # Nodemailer templates
│   ├── queue/                         # BullMQ job definitions + processor
│   └── users/                         # User CRUD, argon2id hashing
└── shared/
    ├── api-client/                    # Axios + auth interceptors (silent refresh)
    ├── schemas/                       # Zod validation schemas
    ├── types/                         # Shared TypeScript types
    └── ui/                            # React component library (Tailwind)
```

### Creating New Endpoints

1. **Create a new controller**:
   ```typescript
   // apps/backend/src/app/users.controller.ts
   import { Controller, Get, Param } from '@nestjs/common';
   import { UsersService } from './users.service';

   @Controller('users')
   export class UsersController {
     constructor(private readonly usersService: UsersService) {}

     @Get(':id')
     getUser(@Param('id') id: string) {
       return this.usersService.findUser(id);
     }
   }
   ```

2. **Create the service**:
   ```typescript
   // apps/backend/src/app/users.service.ts
   import { Injectable } from '@nestjs/common';

   @Injectable()
   export class UsersService {
     findUser(id: string) {
       return { id, name: 'John Doe' };
     }
   }
   ```

3. **Add to app module**:
   ```typescript
   // apps/backend/src/app/app.module.ts
   import { Module } from '@nestjs/common';
   import { ConfigModule } from '@nestjs/config';
   import { AppController } from './app.controller';
   import { AppService } from './app.service';
   import { HealthController } from './health.controller';
   import { UsersController } from './users.controller';
   import { UsersService } from './users.service';

   @Module({
     imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' })],
     controllers: [AppController, HealthController, UsersController],
     providers: [AppService, UsersService],
   })
   export class AppModule {}
   ```

4. Save and test:
   ```bash
   curl http://localhost:3000/users/123
   # {"id":"123","name":"John Doe"}
   ```

## Testing

### Unit Tests

Run tests in watch mode (re-run on file changes):

```bash
pnpm nx test backend --watch
```

Or run once:

```bash
pnpm nx test backend
```

**Creating a test**:

```typescript
// apps/backend/src/app/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should return a user', () => {
    const user = service.findUser('1');
    expect(user).toEqual({ id: '1', name: 'John Doe' });
  });
});
```

Run your new test:

```bash
pnpm nx test backend
```

## Debugging

### VS Code Debugging

**Launch configuration** (`.vscode/launch.json`):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "NestJS Backend",
      "program": "${workspaceFolder}/apps/backend/src/main.ts",
      "skipFiles": ["<node_internals>/**"],
      "require": ["@swc-node/register"],
      "env": {
        "NODE_ENV": "development",
        "SWCRC": "true"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

Then:
1. Set breakpoints in VS Code
2. Press F5 (Start Debugging)
3. Code execution pauses at breakpoints

### Console Logging

Simple approach — use `console.log` in your code:

```typescript
@Get(':id')
getUser(@Param('id') id: string) {
  console.log('Fetching user:', id);
  return this.usersService.findUser(id);
}
```

The log appears in the dev terminal immediately.

### Inspect Incoming Requests

Use NestJS interceptors to log all HTTP traffic:

```typescript
// apps/backend/src/app/logging.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    console.log(`${request.method} ${request.url}`);
    return next.handle().pipe(tap(() => console.log('Response sent')));
  }
}
```

Add to app module:

```typescript
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './logging.interceptor';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' })],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
```

## Code Quality

### Linting

Check code style (ESLint):

```bash
pnpm lint

# Fix auto-fixable issues
pnpm nx lint backend -- --fix
```

Issues are caught by git hooks if configured (optional).

### Type Checking

Verify TypeScript types:

```bash
pnpm typecheck

# Or for just the backend
pnpm nx typecheck backend
```

### Full Check

Run all quality checks (lint + typecheck + test):

```bash
pnpm lint && pnpm typecheck
```

## Common Patterns

### Using ConfigService

Access environment variables anywhere via dependency injection:

```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyService {
  constructor(private config: ConfigService) {}

  doSomething() {
    const port = this.config.get<number>('PORT');
    const nodeEnv = this.config.get<string>('NODE_ENV');
    console.log(`Running on port ${port} in ${nodeEnv} mode`);
  }
}
```

### Query Parameters & Route Params

```typescript
import { Controller, Get, Query, Param } from '@nestjs/common';

@Controller('items')
export class ItemsController {
  // GET /items/123?filter=active
  @Get(':id')
  getItem(
    @Param('id') id: string,
    @Query('filter') filter?: string,
  ) {
    return { id, filter };
  }
}
```

### POST with Body

```typescript
import { Body, Post } from '@nestjs/common';

@Controller('items')
export class ItemsController {
  @Post()
  createItem(@Body() data: { name: string; description: string }) {
    return { ...data, createdAt: new Date() };
  }
}
```

### Error Handling

```typescript
import { BadRequestException, NotFoundException } from '@nestjs/common';

@Get(':id')
getItem(@Param('id') id: string) {
  if (!id) {
    throw new BadRequestException('ID is required');
  }
  if (id === '999') {
    throw new NotFoundException('Item not found');
  }
  return { id, name: 'Item' };
}
```

## Environment & Configuration

### Add a New Environment Variable

1. **Add to `.env`**:
   ```
   MY_FEATURE_ENABLED=true
   ```

2. **Use in code**:
   ```typescript
   export class MyService {
     constructor(private config: ConfigService) {}

     featureIsEnabled() {
       return this.config.get<boolean>('MY_FEATURE_ENABLED');
     }
   }
   ```

3. **No restart needed** — ConfigService reads on demand (not at startup)

### Environment-Specific Logic

```typescript
const isDev = this.config.get<string>('NODE_ENV') === 'development';

if (isDev) {
  // Log verbose info in dev
  console.log('Detailed info:', data);
} else {
  // Minimal logging in prod
  console.log('Processed request');
}
```

## Performance Tips

### Use Observables (RxJS)

NestJS uses RxJS internally. Leverage it for async operations:

```typescript
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Get('data')
getData(): Observable<{ result: string }> {
  return new Observable((observer) => {
    setTimeout(() => {
      observer.next({ result: 'Done' });
      observer.complete();
    }, 100);
  });
}
```

### Avoid Blocking Operations

Use async/await or Promises instead of synchronous I/O:

```typescript
// ❌ Bad — blocks event loop
const data = fs.readFileSync('file.txt');

// ✅ Good — non-blocking
const data = await fs.promises.readFile('file.txt');
```

## Troubleshooting

### Backend won't start

```bash
# 1. Check for syntax errors
pnpm nx typecheck backend

# 2. Clear node_modules and reinstall
rm -rf apps/backend/node_modules
pnpm install

# 3. Check port 3000 is free
lsof -ti:3000  # macOS/Linux
```

### Hot-reload not working

```bash
# Restart the dev process
Ctrl+C
pnpm dev:backend
```

### Tests fail

```bash
# Run a single test file for debugging
pnpm nx test backend -- --testPathPattern=app.service

# Or with watch mode
pnpm nx test backend --watch
```

### Type errors in IDE but tests pass

Restart your IDE's TypeScript language server (Ctrl+Shift+P → "TypeScript: Restart TS Server").

## Email Verification Flow (Dev)

When a user submits the registration form:

1. `POST /api/auth/register` — backend stores pending data + sends verification email job to Redis
2. Worker picks up the job and sends the email via Mailhog (SMTP port 1025)
3. Open `http://localhost:8025` to see the email with the 6-digit code
4. Enter the code in the frontend — on success, the account is created and the user is logged in

To test resend behavior: wait 30 seconds on the verification screen and click "Resend Code". A new code appears in Mailhog. The previous code is invalidated.

## Mobile App Development

### Running the Employee App

```bash
pnpm mobile            # start Expo dev server
# press 'a' → Android simulator
# press 'i' → iOS simulator
# scan QR   → physical device with Expo Go
```

The app talks to `http://localhost:3000` by default. On a physical device or Android emulator, update `apps/employee/src/lib/api.ts` to point to your machine's LAN IP.

### File Structure

```
apps/employee/
├── app/
│   ├── _layout.tsx          # Root layout — loads fonts, sets up QueryClient, auth check
│   ├── (auth)/login.tsx     # Login form
│   └── (app)/
│       ├── _layout.tsx      # Bottom tab navigator (shifts, leaves, events, history)
│       ├── shifts/          # View own upcoming shifts
│       ├── leaves/          # Leave balances + request form
│       ├── events/          # Clock in/out, log work events
│       └── history/         # Work history timeline
├── src/
│   ├── services/            # Typed API calls (shifts, leaves, events, auth…)
│   ├── stores/
│   │   ├── auth.store.ts    # Zustand + expo-secure-store (token persisted securely)
│   │   └── preferences.store.ts  # UI preferences (event button order)
│   └── components/
│       └── DatePicker.tsx   # Native date picker wrapper
└── eas.json                 # EAS Build profiles
```

### Shared Libraries on Mobile

The mobile app uses the same `@hecto/api-client`, `@hecto/shared-types`, and `@hecto/schemas` as the web app. It has its own UI library `@hecto/ui-native` (NativeWind components).

### Building for Distribution

```bash
# Install EAS CLI (once)
pnpm add -g eas-cli
eas login

# Build for Android
pnpm mobile:build:android

# Build for iOS
pnpm mobile:build:ios
```

Builds run in Expo's cloud. Output links are printed when the build finishes.

## Next Steps

- **Architecture**: Read [Architecture](./architecture.md) to understand project structure
- **Docker & Deployment**: Read [Docker & Deployment](./docker.md) for containerization
- **Commands**: See [Commands Reference](./commands.md) for full task list
