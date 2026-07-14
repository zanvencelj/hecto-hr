import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { AdminInvitation } from '@hecto/shared-types';
import { TasksQueueService } from '@hecto/queue';
import type { Invitation } from '@hecto/database';
import { AdminInvitationsRepository } from './admin-invitations.repository';
import { AdminAuditService } from '../audit/admin-audit.service';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AdminInvitationsService {
  constructor(
    private readonly invitationsRepository: AdminInvitationsRepository,
    private readonly queue: TasksQueueService,
    private readonly config: ConfigService,
    private readonly auditService: AdminAuditService,
  ) {}

  async resend(id: string, adminUserId: string): Promise<AdminInvitation> {
    const found = await this.invitationsRepository.findById(id);
    if (!found) throw new NotFoundException('Invitation not found');

    const { invitation, organizationName } = found;
    if (invitation.status === 'accepted' || invitation.status === 'cancelled') {
      throw new BadRequestException(`Cannot resend a ${invitation.status} invitation`);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    const renewed = await this.invitationsRepository.renew(id, tokenHash, expiresAt);

    const appUrl = this.config.getOrThrow<string>('APP_URL');
    const inviteLink = `${appUrl}/auth/accept-invite?token=${token}`;
    await this.queue.sendInvitationEmail(
      invitation.email,
      invitation.firstName,
      inviteLink,
      organizationName ?? 'your organization',
      'HectoHR Support',
    );

    await this.auditService.record({
      adminUserId,
      action: 'invitation.resend',
      entityType: 'invitation',
      entityId: id,
      organizationId: invitation.organizationId,
      before: { status: invitation.status, expiresAt: invitation.expiresAt.toISOString() },
      after: { status: renewed.status, expiresAt: renewed.expiresAt.toISOString() },
    });

    return toPublic(renewed);
  }
}

function toPublic(invitation: Invitation): AdminInvitation {
  return {
    id: invitation.id,
    organizationId: invitation.organizationId,
    email: invitation.email,
    firstName: invitation.firstName,
    lastName: invitation.lastName,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
  };
}
