import { pgEnum, pgTable, uuid, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';

export const assignmentStrategyEnum = pgEnum('assignment_strategy', [
  'preference_first',
  'fairness_first',
  'preference_only',
]);

export type AssignmentStrategy = (typeof assignmentStrategyEnum.enumValues)[number];

export const schedulingDefaultAvailabilityEnum = pgEnum('scheduling_default_availability', [
  'available',
  'unavailable',
]);

export type SchedulingDefaultAvailability =
  (typeof schedulingDefaultAvailabilityEnum.enumValues)[number];

export const schedulingSettings = pgTable('scheduling_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  maxHoursPerWeek: integer('max_hours_per_week').notNull().default(40),
  minRestHours: integer('min_rest_hours').notNull().default(11),
  enforceMaxHours: boolean('enforce_max_hours').notNull().default(true),
  enforceRestRule: boolean('enforce_rest_rule').notNull().default(true),
  defaultAvailability: schedulingDefaultAvailabilityEnum('default_availability')
    .notNull()
    .default('available'),
  assignmentStrategy: assignmentStrategyEnum('assignment_strategy')
    .notNull()
    .default('preference_first'),
  allowClaimingDuringDraft: boolean('allow_claiming_during_draft').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type SchedulingSettings = typeof schedulingSettings.$inferSelect;
export type NewSchedulingSettings = typeof schedulingSettings.$inferInsert;
