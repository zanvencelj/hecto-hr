import {
  pgEnum,
  pgTable,
  uuid,
  boolean,
  date,
  numeric,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { users } from './users.schema';
import { leaveTypes } from './leave-types.schema';

export const leaveRequestStatusEnum = pgEnum('leave_request_status', [
  'pending',
  'approved',
  'rejected',
  'cancelled',
]);

export const leaveRequests = pgTable('leave_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  leaveTypeId: uuid('leave_type_id')
    .notNull()
    .references(() => leaveTypes.id, { onDelete: 'restrict' }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  totalDays: numeric('total_days', { precision: 5, scale: 1 }).notNull(),
  status: leaveRequestStatusEnum('status').default('pending').notNull(),
  requestedByUserId: uuid('requested_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  isManualEntry: boolean('is_manual_entry').default(false).notNull(),
  isEdited: boolean('is_edited').default(false).notNull(),
  editedByUserId: uuid('edited_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  notes: text('notes'),
  reviewNotes: text('review_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type NewLeaveRequest = typeof leaveRequests.$inferInsert;
