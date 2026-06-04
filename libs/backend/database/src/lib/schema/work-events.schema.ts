import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { users } from './users.schema';

export const workEventTypeEnum = pgEnum('work_event_type', [
  'arrival',
  'departure',
  'break_start',
  'break_end',
  'remote_arrival',
  'business_trip_start',
  'business_trip_end',
]);

export const workEvents = pgTable('work_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  type: workEventTypeEnum('type').notNull(),
  notes: text('notes'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type WorkEvent = typeof workEvents.$inferSelect;
export type NewWorkEvent = typeof workEvents.$inferInsert;
export type WorkEventType = (typeof workEventTypeEnum.enumValues)[number];
