import {
  pgTable,
  uuid,
  integer,
  boolean,
  date,
  text,
  time,
  timestamp,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { users } from './users.schema';

export const staffingTemplates = pgTable('staffing_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  daysOfWeek: integer('days_of_week').array().notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  headcount: integer('headcount').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true).notNull(),
  createdByUserId: uuid('created_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type StaffingTemplate = typeof staffingTemplates.$inferSelect;
export type NewStaffingTemplate = typeof staffingTemplates.$inferInsert;
