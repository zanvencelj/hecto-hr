import { isNull, type Column, type SQL } from 'drizzle-orm';

/**
 * Append `{ updatedAt: new Date() }` to any update payload so callers
 * never forget to bump the timestamp.
 *
 * Usage: db.update(table).set(withUpdatedAt({ field: value }))
 */
export function withUpdatedAt<T extends Record<string, unknown>>(
  values: T,
): T & { updatedAt: Date } {
  return { ...values, updatedAt: new Date() } as T & { updatedAt: Date };
}

/**
 * Returns a Drizzle SQL condition that filters out soft-deleted rows.
 *
 * Usage: .where(and(eq(table.id, id), notDeleted(table.deletedAt)))
 */
export function notDeleted(deletedAtColumn: Column): SQL {
  return isNull(deletedAtColumn);
}
