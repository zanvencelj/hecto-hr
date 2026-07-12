import { Injectable } from '@nestjs/common';
import type { AdminAuditLogEntry, Paginated } from '@hecto/shared-types';
import { AdminAuditRepository, type AdminAuditLogWithEmail } from './admin-audit.repository';

export interface AuditRecordData {
  adminUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  organizationId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly auditRepository: AdminAuditRepository) {}

  async record(data: AuditRecordData): Promise<void> {
    await this.auditRepository.create({
      adminUserId: data.adminUserId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      organizationId: data.organizationId ?? null,
      before: data.before ?? null,
      after: data.after ?? null,
    });
  }

  async list(limit: number, offset: number): Promise<Paginated<AdminAuditLogEntry>> {
    const { items, total } = await this.auditRepository.list(limit, offset);
    return { items: items.map(toPublic), total };
  }
}

function toPublic(log: AdminAuditLogWithEmail): AdminAuditLogEntry {
  return {
    id: log.id,
    adminUserId: log.adminUserId,
    adminEmail: log.adminEmail,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    organizationId: log.organizationId,
    before: log.before,
    after: log.after,
    createdAt: log.createdAt.toISOString(),
  };
}
