import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles } from '@hecto/auth';
import type { AdminAuditLogEntry, Paginated } from '@hecto/shared-types';
import { AdminAuditService } from './admin-audit.service';
import { PaginationQueryDto } from '../dto/pagination.dto';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class AdminAuditController {
  constructor(private readonly auditService: AdminAuditService) {}

  @Get()
  list(@Query() query: PaginationQueryDto): Promise<Paginated<AdminAuditLogEntry>> {
    return this.auditService.list(query.limit ?? 50, query.offset ?? 0);
  }
}
