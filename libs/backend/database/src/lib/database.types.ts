import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema/index';

export type Database = NodePgDatabase<typeof schema>;
