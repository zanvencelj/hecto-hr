// CI guard: every up migration must ship a paired .down.sql (real revert SQL,
// or a "-- IRREVERSIBLE: <reason>" header-only file for genuinely one-way migrations).
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'migrations');
const upFiles = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'));

const missing = upFiles.filter((f) => !fs.existsSync(path.join(dir, f.replace(/\.sql$/, '.down.sql'))));

if (missing.length > 0) {
  console.error(`Missing .down.sql for: ${missing.join(', ')}`);
  console.error(
    'Add a paired down migration, or a header-only "-- IRREVERSIBLE: <reason>" file for migrations that truly cannot be reverted.',
  );
  process.exit(1);
}

console.log(`check-down-migrations: all ${upFiles.length} migrations have a paired down.sql`);
