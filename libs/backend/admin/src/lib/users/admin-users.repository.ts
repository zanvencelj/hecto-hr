import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type Database,
  organizations,
  sessions,
  users,
  type Session,
  type User,
} from '@hecto/database';

/** User row without passwordHash, joined with its organization's name. */
export interface AdminUserRow {
  id: string;
  organizationId: string | null;
  organizationName: string | null;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role: User['role'];
  isActive: boolean;
  deletedAt: Date | null;
  dateJoined: Date;
  lastLogin: Date | null;
  createdAt: Date;
}

const adminUserColumns = {
  id: users.id,
  organizationId: users.organizationId,
  organizationName: organizations.name,
  email: users.email,
  username: users.username,
  firstName: users.firstName,
  lastName: users.lastName,
  role: users.role,
  isActive: users.isActive,
  deletedAt: users.deletedAt,
  dateJoined: users.dateJoined,
  lastLogin: users.lastLogin,
  createdAt: users.createdAt,
};

@Injectable()
export class AdminUsersRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async list(
    limit: number,
    offset: number,
    search?: string,
    organizationId?: string,
  ): Promise<{ items: AdminUserRow[]; total: number }> {
    const filters: SQL[] = [];
    const searchFilter = buildSearchFilter(search);
    if (searchFilter) filters.push(searchFilter);
    if (organizationId) filters.push(eq(users.organizationId, organizationId));
    const where = filters.length > 0 ? and(...filters) : undefined;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select(adminUserColumns)
        .from(users)
        .leftJoin(organizations, eq(users.organizationId, organizations.id))
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ value: count() }).from(users).where(where),
    ]);

    return { items: rows, total: totalRows[0]?.value ?? 0 };
  }

  async findById(id: string): Promise<AdminUserRow | undefined> {
    const result = await this.db
      .select(adminUserColumns)
      .from(users)
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  }

  async update(
    id: string,
    data: Partial<
      Pick<User, 'firstName' | 'lastName' | 'username' | 'role' | 'isActive' | 'deletedAt'>
    >,
  ): Promise<void> {
    await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async listSessions(userId: string): Promise<Session[]> {
    return this.db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.lastUsedAt));
  }

  async deactivateAllSessions(userId: string): Promise<void> {
    await this.db.update(sessions).set({ isActive: false }).where(eq(sessions.userId, userId));
  }
}

function buildSearchFilter(search?: string): SQL | undefined {
  if (!search) return undefined;
  const pattern = `%${search}%`;
  return or(
    ilike(users.email, pattern),
    ilike(users.firstName, pattern),
    ilike(users.lastName, pattern),
    ilike(users.username, pattern),
  );
}
