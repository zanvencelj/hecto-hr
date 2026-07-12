import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { users } from './users.schema';

export const kioskDevices = pgTable(
  'kiosk_devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    pairedByUserId: uuid('paired_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('kiosk_devices_organization_id_idx').on(table.organizationId)],
);

export const kioskPairingCodes = pgTable(
  'kiosk_pairing_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    codeHash: varchar('code_hash', { length: 64 }).notNull().unique(),
    deviceName: varchar('device_name', { length: 150 }).notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    usedAt: timestamp('used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('kiosk_pairing_codes_organization_id_idx').on(table.organizationId)],
);

export type KioskDevice = typeof kioskDevices.$inferSelect;
export type NewKioskDevice = typeof kioskDevices.$inferInsert;
export type KioskPairingCode = typeof kioskPairingCodes.$inferSelect;
export type NewKioskPairingCode = typeof kioskPairingCodes.$inferInsert;
