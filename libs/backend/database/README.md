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

Migration files are stored in `libs/backend/database/migrations/`. Always generate migrations via `pnpm db:generate` — never hand-write a migration `.sql` file. Hand-written migrations don't get a `meta/*_snapshot.json`, which silently breaks the snapshot chain: the next `db:generate` diffs against the last *known* snapshot, not your hand-written change, and regenerates a duplicate migration. That's what caused the migrate service to loop forever on a fresh database (`type "user_role" already exists`) before this was fixed. CI now fails (`db:check-drift`) if `db:generate` would produce any change against what's committed.

### Reverting a migration

drizzle-kit has no built-in down-migration support, so every migration `NNNN_name.sql` ships a paired `NNNN_name.down.sql`. CI (`db:check-down-migrations`) fails if one is missing. Two header conventions:

- `-- DESTRUCTIVE: <reason>` — the down SQL is real and runs, but it's lossy (e.g. dropping a table re-created by the up migration). Requires `--force`.
- `-- IRREVERSIBLE: <reason>` — no down path exists at all (e.g. a one-way data backfill). `db:revert` always refuses these; recovery is via `db:restore` from a backup.

```bash
# Revert the most recently applied migration
pnpm db:revert

# Revert the last 3
pnpm db:revert --steps 3

# Revert everything applied after a given migration
pnpm db:revert --to 0007_tiresome_fallen_one

# Required for migrations marked DESTRUCTIVE
pnpm db:revert --force
```

Each revert shows the down SQL, requires you to type the migration's tag back to confirm, then runs inside a transaction under a Postgres advisory lock — a failure rolls back cleanly and leaves the database untouched.

### Backups

The prod `migrate` service (`docker-compose.prod.yml`) takes a timestamped `pg_dump` to `/backups` before applying any migration, keeping the last 10 (`BACKUP_RETENTION`). If a revert isn't enough — or a migration is marked `IRREVERSIBLE` — restore the most recent backup:

```bash
docker compose -f docker-compose.prod.yml run --rm migrate libs/backend/database/scripts/restore.sh
```

### Retry behavior

The `migrate` service retries up to 3 times (`restart: on-failure:3`) then stops — a real failure surfaces as an exited container instead of retrying forever.

## Required environment variable

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (`postgres://user:pass@host:5432/db`) |
