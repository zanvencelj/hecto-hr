import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type Database,
  passwordResets,
  type PasswordReset,
  type NewPasswordReset,
} from '@hecto/database';

@Injectable()
export class PasswordResetsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async create(data: NewPasswordReset): Promise<PasswordReset> {
    const result = await this.db.insert(passwordResets).values(data).returning();
    return result[0]!;
  }

  async findValidByTokenHash(tokenHash: string): Promise<PasswordReset | undefined> {
    const result = await this.db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.tokenHash, tokenHash),
          isNull(passwordResets.usedAt),
          gt(passwordResets.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return result[0];
  }

  async markUsed(id: string): Promise<void> {
    await this.db
      .update(passwordResets)
      .set({ usedAt: new Date() })
      .where(eq(passwordResets.id, id));
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.db.delete(passwordResets).where(eq(passwordResets.userId, userId));
  }
}
