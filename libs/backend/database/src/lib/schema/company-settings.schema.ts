import { pgTable, uuid, integer, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';

export const companySettings = pgTable('company_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  weekendDays: integer('weekend_days').array().notNull().default([0, 6]),
  unpaidBreakThresholdMinutes: integer('unpaid_break_threshold_minutes').notNull().default(60),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type CompanySettings = typeof companySettings.$inferSelect;
export type NewCompanySettings = typeof companySettings.$inferInsert;
