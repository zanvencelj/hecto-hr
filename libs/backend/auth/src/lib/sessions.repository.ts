import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, type Database, sessions, type Session, type NewSession } from '@hecto/database';

@Injectable()
export class SessionsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async create(data: NewSession): Promise<Session> {
    const result = await this.db.insert(sessions).values(data).returning();
    return result[0]!;
  }

  async findActiveById(id: string): Promise<Session | undefined> {
    const result = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, id), eq(sessions.isActive, true)))
      .limit(1);
    return result[0];
  }

  async findAllActiveByUserId(userId: string): Promise<Session[]> {
    return this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), eq(sessions.isActive, true)));
  }

  async touch(id: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(sessions.id, id));
  }

  async deactivate(id: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ isActive: false })
      .where(eq(sessions.id, id));
  }

  async deactivateAllForUser(userId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ isActive: false })
      .where(eq(sessions.userId, userId));
  }
}
