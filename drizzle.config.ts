import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: '.env' });

export default defineConfig({
  schema: './libs/backend/database/src/lib/schema/index.ts',
  out: './libs/backend/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL']!,
  },
});
