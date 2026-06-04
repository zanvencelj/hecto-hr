import { pgTable, uuid, integer, boolean, time, timestamp, unique } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { users } from './users.schema';

export const employeeAvailability = pgTable(
  'employee_availability',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(),
    isAvailable: boolean('is_available').notNull().default(true),
    timeFrom: time('time_from'),
    timeTo: time('time_to'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.dayOfWeek)],
);

export type EmployeeAvailability = typeof employeeAvailability.$inferSelect;
export type NewEmployeeAvailability = typeof employeeAvailability.$inferInsert;
