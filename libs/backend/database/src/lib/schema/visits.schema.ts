import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { kioskDevices } from './kiosk-devices.schema';

export const visits = pgTable(
  'visits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    deviceId: uuid('device_id').references(() => kioskDevices.id, {
      onDelete: 'set null',
    }),
    name: varchar('name', { length: 200 }).notNull(),
    purpose: varchar('purpose', { length: 500 }).notNull(),
    signatureKey: varchar('signature_key', { length: 512 }).notNull(),
    signedInAt: timestamp('signed_in_at', { withTimezone: true }).defaultNow().notNull(),
    signedOutAt: timestamp('signed_out_at', { withTimezone: true }),
    autoClosedAt: timestamp('auto_closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('visits_organization_id_idx').on(table.organizationId),
    index('visits_org_open_idx').on(table.organizationId, table.signedOutAt),
    index('visits_org_signed_in_at_idx').on(table.organizationId, table.signedInAt),
  ],
);

export type Visit = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;
