import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

/**
 * Single global row (id is always 'singleton') holding the current mobile app
 * download links shown on the landing page. Editable from the admin app so a
 * new EAS build can be published without rebuilding/redeploying the landing site.
 */
export const appLinks = pgTable('app_links', {
  id: text('id').primaryKey().default('singleton'),
  androidApkUrl: text('android_apk_url'),
  iosDownloadUrl: text('ios_download_url'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
});

export type AppLinks = typeof appLinks.$inferSelect;
export type NewAppLinks = typeof appLinks.$inferInsert;
