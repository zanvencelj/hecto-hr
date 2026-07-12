import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type Database,
  pushTokens,
  type PushToken,
} from '@hecto/database';

@Injectable()
export class PushTokensRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async upsert(userId: string, token: string): Promise<PushToken> {
    const result = await this.db
      .insert(pushTokens)
      .values({ userId, token })
      .onConflictDoUpdate({
        target: [pushTokens.userId, pushTokens.token],
        set: { updatedAt: new Date() },
      })
      .returning();
    return result[0]!;
  }

  async delete(userId: string, token: string): Promise<void> {
    await this.db
      .delete(pushTokens)
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));
  }

  async findByUserId(userId: string): Promise<PushToken[]> {
    return this.db.select().from(pushTokens).where(eq(pushTokens.userId, userId));
  }

  async findByUserIds(userIds: string[]): Promise<PushToken[]> {
    if (userIds.length === 0) return [];
    return this.db.select().from(pushTokens).where(inArray(pushTokens.userId, userIds));
  }
}
