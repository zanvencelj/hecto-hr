import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, between } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type Database,
  workEvents,
  type WorkEvent,
  type NewWorkEvent,
  type WorkEventType,
} from '@hecto/database';

@Injectable()
export class EventsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async create(data: NewWorkEvent): Promise<WorkEvent> {
    const result = await this.db.insert(workEvents).values(data).returning();
    return result[0]!;
  }

  async findById(id: string): Promise<WorkEvent | undefined> {
    const result = await this.db.select().from(workEvents).where(eq(workEvents.id, id));
    return result[0];
  }

  async update(
    id: string,
    data: { type: WorkEventType; occurredAt: Date; notes: string | null },
  ): Promise<WorkEvent> {
    const result = await this.db
      .update(workEvents)
      .set(data)
      .where(eq(workEvents.id, id))
      .returning();
    return result[0]!;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(workEvents).where(eq(workEvents.id, id));
  }

  async findByUserId(
    userId: string,
    organizationId: string,
    from?: string,
    to?: string,
  ): Promise<WorkEvent[]> {
    const conditions = [
      eq(workEvents.userId, userId),
      eq(workEvents.organizationId, organizationId),
    ];
    if (from && to) {
      conditions.push(between(workEvents.occurredAt, new Date(from), new Date(to)));
    }
    return this.db
      .select()
      .from(workEvents)
      .where(and(...conditions))
      .orderBy(desc(workEvents.occurredAt));
  }

  async findByOrganization(
    organizationId: string,
    from?: string,
    to?: string,
  ): Promise<WorkEvent[]> {
    const conditions = [eq(workEvents.organizationId, organizationId)];
    if (from && to) {
      conditions.push(between(workEvents.occurredAt, new Date(from), new Date(to)));
    }
    return this.db
      .select()
      .from(workEvents)
      .where(and(...conditions))
      .orderBy(desc(workEvents.occurredAt));
  }
}
