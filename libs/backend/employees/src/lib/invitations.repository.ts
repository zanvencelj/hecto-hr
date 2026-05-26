import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type Database,
  invitations,
  type Invitation,
  type NewInvitation,
} from '@hecto/database';

@Injectable()
export class InvitationsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async create(data: NewInvitation): Promise<Invitation> {
    const result = await this.db.insert(invitations).values(data).returning();
    return result[0]!;
  }

  async findByTokenHash(tokenHash: string): Promise<Invitation | null> {
    const result = await this.db
      .select()
      .from(invitations)
      .where(and(eq(invitations.tokenHash, tokenHash), eq(invitations.status, 'pending')))
      .limit(1);
    return result[0] ?? null;
  }

  async findByEmailAndOrg(email: string, organizationId: string): Promise<Invitation | null> {
    const result = await this.db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email.toLowerCase()),
          eq(invitations.organizationId, organizationId),
          eq(invitations.status, 'pending'),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async findAllByOrg(organizationId: string): Promise<Invitation[]> {
    return this.db
      .select()
      .from(invitations)
      .where(eq(invitations.organizationId, organizationId));
  }

  async markAccepted(id: string, acceptedUserId: string): Promise<void> {
    await this.db
      .update(invitations)
      .set({ status: 'accepted', acceptedUserId })
      .where(eq(invitations.id, id));
  }

  async markCancelled(id: string): Promise<void> {
    await this.db
      .update(invitations)
      .set({ status: 'cancelled' })
      .where(eq(invitations.id, id));
  }
}
