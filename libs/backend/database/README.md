# @hecto/database

Drizzle ORM setup and schema definitions for the Hectohr backend. Exposes a global `DatabaseModule` that provides a typed Drizzle client to the NestJS DI container, plus the `users` and `sessions` table schemas.

## Usage

`DatabaseModule` is global — import it once in the root module:

```typescript
import { DatabaseModule } from '@hecto/database';

@Module({ imports: [DatabaseModule] })
export class AppModule {}
```

Inject the client in any service:

```typescript
import { Inject } from '@nestjs/common';
import { DRIZZLE_CLIENT, DrizzleClient } from '@hecto/database';

@Injectable()
export class MyRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private db: DrizzleClient) {}
}
```

## Schema

### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK, random default |
| `email` | `varchar(255)` | Unique, required |
| `username` | `varchar(150)` | Unique, optional |
| `password_hash` | `varchar(255)` | argon2id hash |
| `first_name`, `last_name` | `varchar(150)` | Optional |
| `is_active` | `boolean` | Default `true` |
| `is_superuser`, `is_staff` | `boolean` | Role flags |
| `date_joined`, `last_login`, `created_at`, `updated_at` | `timestamptz` | Audit fields |

### `sessions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK, random default; embedded in JWTs |
| `user_id` | `uuid` | FK → `users.id` (cascade delete) |
| `ip_address` | `varchar(45)` | Supports IPv6 |
| `user_agent` | `text` | Raw UA string |
| `device_name` | `varchar(255)` | Detected or client-supplied |
| `platform` | `varchar(50)` | `web`, `mobile`, or `api` |
| `is_active` | `boolean` | Set to `false` on logout |
| `last_used_at` | `timestamptz` | Updated on token refresh |
| `expires_at` | `timestamptz` | Hard expiry enforced by auth service |

## Migrations

```bash
# Generate migration after schema changes
pnpm db:generate

# Apply pending migrations to the database
pnpm db:migrate
```

Migration files are stored in `libs/backend/database/migrations/`.

## Required environment variable

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (`postgres://user:pass@host:5432/db`) |
