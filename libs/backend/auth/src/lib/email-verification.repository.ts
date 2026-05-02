import { Inject, Injectable } from '@nestjs/common';
import { eq, and, gt, lt, sql } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type Database,
  emailVerifications,
  type EmailVerification,
  type NewEmailVerification,
} from '@hecto/database';

@Injectable()
export class EmailVerificationRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async upsertForEmail(data: NewEmailVerification): Promise<EmailVerification> {
    await this.db.delete(emailVerifications).where(eq(emailVerifications.email, data.email));
    const result = await this.db.insert(emailVerifications).values(data).returning();
    return result[0]!;
  }

  async findActiveByEmail(email: string): Promise<EmailVerification | undefined> {
    const result = await this.db
      .select()
      .from(emailVerifications)
      .where(and(eq(emailVerifications.email, email), gt(emailVerifications.expiresAt, new Date())))
      .limit(1);
    return result[0];
  }

  async incrementWrongAttempts(id: string): Promise<EmailVerification> {
    const result = await this.db
      .update(emailVerifications)
      .set({ wrongAttempts: sql`${emailVerifications.wrongAttempts} + 1` })
      .where(eq(emailVerifications.id, id))
      .returning();
    return result[0]!;
  }

  async updateForResend(id: string, codeHash: string, expiresAt: Date): Promise<EmailVerification> {
    const result = await this.db
      .update(emailVerifications)
      .set({
        codeHash,
        expiresAt,
        lastResentAt: new Date(),
        wrongAttempts: 0,
        resendCount: sql`${emailVerifications.resendCount} + 1`,
      })
      .where(eq(emailVerifications.id, id))
      .returning();
    return result[0]!;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(emailVerifications).where(eq(emailVerifications.id, id));
  }

  async deleteExpired(): Promise<void> {
    await this.db
      .delete(emailVerifications)
      .where(lt(emailVerifications.expiresAt, new Date()));
  }
}
