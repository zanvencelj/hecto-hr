import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type Database,
  visits,
  type Visit,
  type NewVisit,
  kioskDevices,
  withUpdatedAt,
} from '@hecto/database';

export interface VisitWithDevice extends Visit {
  deviceName: string | null;
}

@Injectable()
export class VisitsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async create(data: NewVisit): Promise<Visit> {
    const result = await this.db.insert(visits).values(data).returning();
    return result[0]!;
  }

  async findByIdInOrg(id: string, organizationId: string): Promise<Visit | undefined> {
    const result = await this.db
      .select()
      .from(visits)
      .where(and(eq(visits.id, id), eq(visits.organizationId, organizationId)))
      .limit(1);
    return result[0];
  }

  async findOpenByOrg(organizationId: string): Promise<VisitWithDevice[]> {
    return this.selectWithDevice()
      .where(and(eq(visits.organizationId, organizationId), isNull(visits.signedOutAt)))
      .orderBy(desc(visits.signedInAt));
  }

  async findByOrg(
    organizationId: string,
    from?: Date,
    to?: Date,
  ): Promise<VisitWithDevice[]> {
    const conditions = [eq(visits.organizationId, organizationId)];
    if (from) conditions.push(gte(visits.signedInAt, from));
    if (to) conditions.push(lte(visits.signedInAt, to));

    return this.selectWithDevice()
      .where(and(...conditions))
      .orderBy(desc(visits.signedInAt));
  }

  async signOut(id: string, autoClosed = false): Promise<Visit | undefined> {
    const now = new Date();
    const result = await this.db
      .update(visits)
      .set(
        withUpdatedAt({
          signedOutAt: now,
          ...(autoClosed ? { autoClosedAt: now } : {}),
        }),
      )
      .where(and(eq(visits.id, id), isNull(visits.signedOutAt)))
      .returning();
    return result[0];
  }

  private selectWithDevice() {
    return this.db
      .select({
        id: visits.id,
        organizationId: visits.organizationId,
        deviceId: visits.deviceId,
        name: visits.name,
        purpose: visits.purpose,
        signatureKey: visits.signatureKey,
        signedInAt: visits.signedInAt,
        signedOutAt: visits.signedOutAt,
        autoClosedAt: visits.autoClosedAt,
        createdAt: visits.createdAt,
        updatedAt: visits.updatedAt,
        deviceName: kioskDevices.name,
      })
      .from(visits)
      .leftJoin(kioskDevices, eq(visits.deviceId, kioskDevices.id));
  }
}
