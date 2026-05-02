import { pgTable, uuid, varchar, boolean, timestamp, text } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  deviceName: varchar('device_name', { length: 255 }),
  platform: varchar('platform', { length: 50 }),
  isActive: boolean('is_active').default(true).notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
