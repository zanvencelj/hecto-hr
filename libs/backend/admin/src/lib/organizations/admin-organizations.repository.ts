import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, ne, or, type SQL } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type Database,
  organizations,
  users,
  type Organization,
} from '@hecto/database';

export interface OrganizationWithUserCount extends Organization {
  userCount: number;
}

@Injectable()
export class AdminOrganizationsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async list(
    limit: number,
    offset: number,
    search?: string,
  ): Promise<{ items: OrganizationWithUserCount[]; total: number }> {
    const where = buildSearchFilter(search);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          isActive: organizations.isActive,
          deletedAt: organizations.deletedAt,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt,
          userCount: count(users.id),
        })
        .from(organizations)
        .leftJoin(users, eq(users.organizationId, organizations.id))
        .where(where)
        .groupBy(organizations.id)
        .orderBy(desc(organizations.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ value: count() }).from(organizations).where(where),
    ]);

    return { items: rows, total: totalRows[0]?.value ?? 0 };
  }

  async findById(id: string): Promise<OrganizationWithUserCount | undefined> {
    const result = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        isActive: organizations.isActive,
        deletedAt: organizations.deletedAt,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        userCount: count(users.id),
      })
      .from(organizations)
      .leftJoin(users, eq(users.organizationId, organizations.id))
      .where(eq(organizations.id, id))
      .groupBy(organizations.id)
      .limit(1);
    return result[0];
  }

  async isSlugTakenByOther(slug: string, excludeId: string): Promise<boolean> {
    const result = await this.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(and(eq(organizations.slug, slug), ne(organizations.id, excludeId)))
      .limit(1);
    return result.length > 0;
  }

  async update(
    id: string,
    data: Partial<Pick<Organization, 'name' | 'slug' | 'isActive' | 'deletedAt'>>,
  ): Promise<Organization> {
    const result = await this.db
      .update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return result[0]!;
  }
}

function buildSearchFilter(search?: string): SQL | undefined {
  if (!search) return undefined;
  const pattern = `%${search}%`;
  return or(ilike(organizations.name, pattern), ilike(organizations.slug, pattern));
}
