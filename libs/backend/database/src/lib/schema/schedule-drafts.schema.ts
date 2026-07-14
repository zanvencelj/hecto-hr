import {
  pgEnum,
  pgTable,
  uuid,
  date,
  integer,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { users } from './users.schema';
import { shifts } from './shifts.schema';

export const scheduleDraftStatusEnum = pgEnum('schedule_draft_status', [
  'draft',
  'published',
  'discarded',
]);

export type ScheduleDraftStatus = (typeof scheduleDraftStatusEnum.enumValues)[number];

export const draftAssignmentStatusEnum = pgEnum('draft_assignment_status', [
  'proposed',
  'manual',
  'stale',
  'unfilled',
]);

export type DraftAssignmentStatus = (typeof draftAssignmentStatusEnum.enumValues)[number];

export const scheduleDrafts = pgTable('schedule_drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  dateFrom: date('date_from').notNull(),
  dateTo: date('date_to').notNull(),
  status: scheduleDraftStatusEnum('status').default('draft').notNull(),
  createdByUserId: uuid('created_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ScheduleDraft = typeof scheduleDrafts.$inferSelect;
export type NewScheduleDraft = typeof scheduleDrafts.$inferInsert;

export const scheduleDraftAssignments = pgTable(
  'schedule_draft_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    draftId: uuid('draft_id')
      .notNull()
      .references(() => scheduleDrafts.id, { onDelete: 'cascade' }),
    shiftId: uuid('shift_id')
      .notNull()
      .references(() => shifts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    status: draftAssignmentStatusEnum('status').default('proposed').notNull(),
    score: integer('score'),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.draftId, t.shiftId)],
);

export type ScheduleDraftAssignment = typeof scheduleDraftAssignments.$inferSelect;
export type NewScheduleDraftAssignment = typeof scheduleDraftAssignments.$inferInsert;
