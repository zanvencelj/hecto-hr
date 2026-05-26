import { pgEnum, pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { userRoleEnum } from './organizations.schema';
import { users } from './users.schema';

export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending',
  'accepted',
  'cancelled',
  'expired',
]);

export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  invitedByUserId: uuid('invited_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  email: varchar('email', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 150 }),
  lastName: varchar('last_name', { length: 150 }),
  role: userRoleEnum('role').default('employee').notNull(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  status: invitationStatusEnum('status').default('pending').notNull(),
  acceptedUserId: uuid('accepted_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
