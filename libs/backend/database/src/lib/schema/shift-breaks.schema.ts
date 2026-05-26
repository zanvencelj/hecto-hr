import { pgTable, uuid, boolean, integer, text, timestamp, time } from 'drizzle-orm/pg-core';
import { shifts } from './shifts.schema';

export const shiftBreaks = pgTable('shift_breaks', {
  id: uuid('id').primaryKey().defaultRandom(),
  shiftId: uuid('shift_id')
    .notNull()
    .references(() => shifts.id, { onDelete: 'cascade' }),
  startTime: time('start_time'),
  endTime: time('end_time'),
  durationMinutes: integer('duration_minutes'),
  isFixed: boolean('is_fixed').default(true).notNull(),
  isPaid: boolean('is_paid').default(false).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ShiftBreak = typeof shiftBreaks.$inferSelect;
export type NewShiftBreak = typeof shiftBreaks.$inferInsert;
