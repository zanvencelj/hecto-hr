import { Inject, Injectable } from '@nestjs/common';
import { count, desc, eq } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type Database,
  adminAuditLogs,
  users,
  type AdminAuditLog,
  type NewAdminAuditLog,
} from '@hecto/database';

export interface AdminAuditLogWithEmail extends AdminAuditLog {
  adminEmail: string | null;
}

@Injectable()
export class AdminAuditRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async create(data: NewAdminAuditLog): Promise<AdminAuditLog> {
    const result = await this.db.insert(adminAuditLogs).values(data).returning();
    return result[0]!;
  }

  async list(limit: number, offset: number): Promise<{ items: AdminAuditLogWithEmail[]; total: number }> {
    const [rows, totalRows] = await Promise.all([
      this.db
        .select({
          id: adminAuditLogs.id,
          adminUserId: adminAuditLogs.adminUserId,
          action: adminAuditLogs.action,
          entityType: adminAuditLogs.entityType,
          entityId: adminAuditLogs.entityId,
          organizationId: adminAuditLogs.organizationId,
          before: adminAuditLogs.before,
          after: adminAuditLogs.after,
          createdAt: adminAuditLogs.createdAt,
          adminEmail: users.email,
        })
        .from(adminAuditLogs)
        .leftJoin(users, eq(adminAuditLogs.adminUserId, users.id))
        .orderBy(desc(adminAuditLogs.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ value: count() }).from(adminAuditLogs),
    ]);
    return { items: rows, total: totalRows[0]?.value ?? 0 };
  }
}
