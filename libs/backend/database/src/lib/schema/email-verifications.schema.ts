import { pgTable, uuid, varchar, smallint, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export type PendingRegistrationData = {
  passwordHash: string;
  organizationName: string;
  firstName: string | null;
  lastName: string | null;
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};

export const emailVerifications = pgTable(
  'email_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull(),
    codeHash: varchar('code_hash', { length: 64 }).notNull(),
    pendingData: jsonb('pending_data').$type<PendingRegistrationData>().notNull(),
    resendCount: smallint('resend_count').default(0).notNull(),
    lastResentAt: timestamp('last_resent_at', { withTimezone: true }),
    wrongAttempts: smallint('wrong_attempts').default(0).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('email_verifications_email_idx').on(table.email)],
);

export type EmailVerification = typeof emailVerifications.$inferSelect;
export type NewEmailVerification = typeof emailVerifications.$inferInsert;
