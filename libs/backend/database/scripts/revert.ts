/**
 * Emergency revert CLI. drizzle-kit has no native down-migration support, so
 * this reads paired `<tag>.down.sql` files, requires the operator to type the
 * migration tag back to confirm, and applies each revert transactionally
 * under a Postgres advisory lock.
 *
 * Usage:
 *   pnpm db:revert                 revert the single most recently applied migration
 *   pnpm db:revert --steps 3       revert the last 3 applied migrations, newest first
 *   pnpm db:revert --to 0007_foo   revert everything applied after 0007_foo
 *   pnpm db:revert --force         also allow migrations marked "-- DESTRUCTIVE:"
 *
 * Migrations marked "-- IRREVERSIBLE:" have no real down SQL and can never be
 * reverted through this tool — recover via restore.sh from a backup instead.
 */
import { config } from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline/promises';
import { Client } from 'pg';

config({ path: '.env' });

const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');
const ADVISORY_LOCK_KEY = 8743211001;

interface JournalEntry {
  idx: number;
  when: number;
  tag: string;
}

interface AppliedMigration {
  id: number;
  tag: string;
}

function parseArgs(argv: string[]) {
  let steps = 1;
  let to: string | undefined;
  let force = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--steps') {
      steps = Number(argv[++i]);
    } else if (argv[i] === '--to') {
      to = argv[++i];
    } else if (argv[i] === '--force') {
      force = true;
    }
  }
  return { steps, to, force };
}

function loadJournal(): JournalEntry[] {
  const raw = readFileSync(join(MIGRATIONS_DIR, 'meta', '_journal.json'), 'utf8');
  return JSON.parse(raw).entries;
}

async function loadApplied(client: Client, journal: JournalEntry[]): Promise<AppliedMigration[]> {
  const { rows } = await client.query<{ id: number; created_at: string }>(
    'SELECT id, created_at FROM drizzle.__drizzle_migrations ORDER BY id ASC',
  );
  return rows.map((row) => {
    const entry = journal.find((e) => Number(e.when) === Number(row.created_at));
    if (!entry) {
      throw new Error(
        `applied migration row id=${row.id} (created_at=${row.created_at}) has no matching journal entry — refusing to guess, fix the journal first`,
      );
    }
    return { id: row.id, tag: entry.tag };
  });
}

function selectTargets(
  applied: AppliedMigration[],
  opts: { steps: number; to?: string },
): AppliedMigration[] {
  if (opts.to) {
    const idx = applied.findIndex((m) => m.tag === opts.to);
    if (idx === -1) {
      throw new Error(`--to ${opts.to} is not an applied migration`);
    }
    return applied.slice(idx + 1).reverse();
  }
  return applied.slice(-opts.steps).reverse();
}

async function confirm(tag: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`Type "${tag}" to confirm revert: `);
    return answer.trim() === tag;
  } finally {
    rl.close();
  }
}

async function revertOne(client: Client, migration: AppliedMigration, force: boolean) {
  const downPath = join(MIGRATIONS_DIR, `${migration.tag}.down.sql`);
  if (!existsSync(downPath)) {
    throw new Error(`missing ${migration.tag}.down.sql — cannot revert`);
  }
  const content = readFileSync(downPath, 'utf8');
  const firstLine = content.split('\n', 1)[0].trim();

  if (firstLine.startsWith('-- IRREVERSIBLE:')) {
    throw new Error(
      `${migration.tag} is marked irreversible (${firstLine.replace('-- IRREVERSIBLE:', '').trim()}). ` +
        `There is no down path — restore from the pre-migration backup via restore.sh instead.`,
    );
  }

  let sql = content;
  if (firstLine.startsWith('-- DESTRUCTIVE:')) {
    if (!force) {
      throw new Error(
        `${migration.tag} is marked destructive (${firstLine.replace('-- DESTRUCTIVE:', '').trim()}) ` +
          `and will lose data even though the schema reverts cleanly. Pass --force to proceed.`,
      );
    }
    console.warn(`⚠ ${migration.tag}: DESTRUCTIVE revert forced — this loses data.`);
    sql = content.split('\n').slice(1).join('\n');
  }

  console.log(`\n--- ${migration.tag}.down.sql ---\n${sql.trim()}\n---`);
  const confirmed = await confirm(migration.tag);
  if (!confirmed) {
    throw new Error(`confirmation did not match "${migration.tag}", aborting`);
  }

  await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('DELETE FROM drizzle.__drizzle_migrations WHERE id = $1', [migration.id]);
    await client.query('COMMIT');
    console.log(`✓ reverted ${migration.tag}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw new Error(
      `revert of ${migration.tag} failed and was rolled back: ${(err as Error).message}. ` +
        `Database is unchanged; restore.sh remains available as a fallback.`,
    );
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!process.env['DATABASE_URL']) {
    throw new Error('DATABASE_URL is not set');
  }

  const journal = loadJournal();
  const client = new Client({ connectionString: process.env['DATABASE_URL'] });
  await client.connect();

  try {
    const applied = await loadApplied(client, journal);
    const targets = selectTargets(applied, opts);

    if (targets.length === 0) {
      console.log('nothing to revert');
      return;
    }

    console.log(`about to revert ${targets.length} migration(s), newest first:`);
    targets.forEach((t) => console.log(`  - ${t.tag}`));

    for (const target of targets) {
      await revertOne(client, target, opts.force);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`db:revert: ${(err as Error).message}`);
  process.exitCode = 1;
});
