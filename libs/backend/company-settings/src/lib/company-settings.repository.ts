import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type Database,
  companySettings,
  organizations,
  type CompanySettings,
} from '@hecto/database';

@Injectable()
export class CompanySettingsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async findOrganizationName(organizationId: string): Promise<string | undefined> {
    const result = await this.db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    return result[0]?.name;
  }

  async updateOrganizationName(organizationId: string, name: string): Promise<void> {
    await this.db
      .update(organizations)
      .set({ name, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId));
  }

  async findSettings(organizationId: string): Promise<CompanySettings | null> {
    const result = await this.db
      .select()
      .from(companySettings)
      .where(eq(companySettings.organizationId, organizationId))
      .limit(1);
    return result[0] ?? null;
  }

  async upsertSettings(
    organizationId: string,
    data: Partial<Pick<CompanySettings, 'weekendDays' | 'unpaidBreakThresholdMinutes'>>,
  ): Promise<CompanySettings> {
    const result = await this.db
      .insert(companySettings)
      .values({ organizationId, ...data })
      .onConflictDoUpdate({
        target: [companySettings.organizationId],
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return result[0]!;
  }
}
