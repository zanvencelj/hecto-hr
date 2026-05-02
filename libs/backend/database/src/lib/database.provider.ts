import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION' as const;

export const databaseProvider = {
  provide: DATABASE_CONNECTION,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const pool = new Pool({
      connectionString: configService.getOrThrow<string>('DATABASE_URL'),
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    return drizzle(pool, { schema });
  },
};
