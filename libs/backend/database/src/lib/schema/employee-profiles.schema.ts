import { pgTable, uuid, varchar, date, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { users } from './users.schema';
import { invitations } from './invitations.schema';

export const employeeProfiles = pgTable('employee_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  invitationId: uuid('invitation_id').references(() => invitations.id, {
    onDelete: 'set null',
  }),
  position: varchar('position', { length: 150 }),
  department: varchar('department', { length: 150 }),
  phone: varchar('phone', { length: 50 }),
  hireDate: date('hire_date'),
  emergencyContact: jsonb('emergency_contact').$type<{
    name: string;
    phone: string;
    relationship: string;
  }>(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type EmployeeProfile = typeof employeeProfiles.$inferSelect;
export type NewEmployeeProfile = typeof employeeProfiles.$inferInsert;
