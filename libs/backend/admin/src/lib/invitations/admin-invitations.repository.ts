import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type Database,
  invitations,
  organizations,
  type Invitation,
} from '@hecto/database';

export interface InvitationWithOrgName {
  invitation: Invitation;
  organizationName: string | null;
}

@Injectable()
export class AdminInvitationsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async findById(id: string): Promise<InvitationWithOrgName | undefined> {
    const result = await this.db
      .select({ invitation: invitations, organizationName: organizations.name })
      .from(invitations)
      .leftJoin(organizations, eq(invitations.organizationId, organizations.id))
      .where(eq(invitations.id, id))
      .limit(1);
    return result[0];
  }

  async renew(id: string, tokenHash: string, expiresAt: Date): Promise<Invitation> {
    const result = await this.db
      .update(invitations)
      .set({ tokenHash, expiresAt, status: 'pending' })
      .where(eq(invitations.id, id))
      .returning();
    return result[0]!;
  }
}
