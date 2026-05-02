import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type Database,
  organizations,
  type Organization,
  type NewOrganization,
} from '@hecto/database';

@Injectable()
export class OrganizationsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async create(data: NewOrganization): Promise<Organization> {
    const result = await this.db.insert(organizations).values(data).returning();
    return result[0]!;
  }

  async findById(id: string): Promise<Organization | undefined> {
    const result = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);
    return result[0];
  }

  async isSlugTaken(slug: string): Promise<boolean> {
    const result = await this.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);
    return result.length > 0;
  }
}
