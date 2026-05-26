import { pgTable, uuid, smallint, numeric, timestamp, unique } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { users } from './users.schema';
import { leaveTypes } from './leave-types.schema';

export const leaveBalances = pgTable(
  'leave_balances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    leaveTypeId: uuid('leave_type_id')
      .notNull()
      .references(() => leaveTypes.id, { onDelete: 'cascade' }),
    year: smallint('year').notNull(),
    totalDays: numeric('total_days', { precision: 5, scale: 1 }).default('0').notNull(),
    usedDays: numeric('used_days', { precision: 5, scale: 1 }).default('0').notNull(),
    pendingDays: numeric('pending_days', { precision: 5, scale: 1 }).default('0').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.leaveTypeId, t.year)],
);

export type LeaveBalance = typeof leaveBalances.$inferSelect;
export type NewLeaveBalance = typeof leaveBalances.$inferInsert;
