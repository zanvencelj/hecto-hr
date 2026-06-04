import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { users } from './users.schema';
import { workEvents, workEventTypeEnum } from './work-events.schema';

export const changeRequestStatusEnum = pgEnum('change_request_status', [
  'pending',
  'approved',
  'rejected',
]);

export const changeRequestTypeEnum = pgEnum('change_request_type', ['add', 'edit', 'delete']);

export const eventChangeRequests = pgTable('event_change_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  requestType: changeRequestTypeEnum('request_type').notNull(),
  eventId: uuid('event_id').references(() => workEvents.id, { onDelete: 'set null' }),
  requestedType: workEventTypeEnum('requested_type'),
  requestedOccurredAt: timestamp('requested_occurred_at', { withTimezone: true }),
  requestedNotes: text('requested_notes'),
  reason: text('reason'),
  status: changeRequestStatusEnum('status').notNull().default('pending'),
  reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewNotes: text('review_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type EventChangeRequest = typeof eventChangeRequests.$inferSelect;
export type NewEventChangeRequest = typeof eventChangeRequests.$inferInsert;
