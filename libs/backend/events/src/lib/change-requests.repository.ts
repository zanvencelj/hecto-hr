import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type Database,
  eventChangeRequests,
  type EventChangeRequest,
  type NewEventChangeRequest,
} from '@hecto/database';

@Injectable()
export class ChangeRequestsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async create(data: NewEventChangeRequest): Promise<EventChangeRequest> {
    const result = await this.db.insert(eventChangeRequests).values(data).returning();
    return result[0]!;
  }

  async findByUserId(userId: string, organizationId: string): Promise<EventChangeRequest[]> {
    return this.db
      .select()
      .from(eventChangeRequests)
      .where(
        and(
          eq(eventChangeRequests.userId, userId),
          eq(eventChangeRequests.organizationId, organizationId),
        ),
      )
      .orderBy(desc(eventChangeRequests.createdAt));
  }

  async findByOrganization(organizationId: string): Promise<EventChangeRequest[]> {
    return this.db
      .select()
      .from(eventChangeRequests)
      .where(eq(eventChangeRequests.organizationId, organizationId))
      .orderBy(desc(eventChangeRequests.createdAt));
  }

  async findById(id: string): Promise<EventChangeRequest | undefined> {
    const result = await this.db
      .select()
      .from(eventChangeRequests)
      .where(eq(eventChangeRequests.id, id));
    return result[0];
  }

  async update(
    id: string,
    data: Partial<EventChangeRequest>,
  ): Promise<EventChangeRequest> {
    const result = await this.db
      .update(eventChangeRequests)
      .set(data)
      .where(eq(eventChangeRequests.id, id))
      .returning();
    return result[0]!;
  }
}
