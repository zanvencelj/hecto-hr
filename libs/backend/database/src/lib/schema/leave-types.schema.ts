import { pgTable, uuid, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';

export const leaveTypes = pgTable('leave_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, {
    onDelete: 'cascade',
  }),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  color: varchar('color', { length: 7 }).default('#6366f1').notNull(),
  defaultDaysPerYear: integer('default_days_per_year').default(0).notNull(),
  isPaid: boolean('is_paid').default(true).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type LeaveType = typeof leaveTypes.$inferSelect;
export type NewLeaveType = typeof leaveTypes.$inferInsert;
