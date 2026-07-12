import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@hecto/auth';
import type { AccessTokenPayload, MonthlySummary, YearlySummary } from '@hecto/shared-types';
import { ReportsService } from './reports.service';

const CURRENT_YEAR = () => new Date().getUTCFullYear();

function parseYear(raw: string | undefined): number {
  const y = parseInt(raw ?? String(CURRENT_YEAR()), 10);
  if (isNaN(y) || y < 2000 || y > 2100) throw new BadRequestException('Invalid year');
  return y;
}

function parseMonth(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const m = parseInt(raw, 10);
  if (isNaN(m) || m < 1 || m > 12) throw new BadRequestException('Invalid month');
  return m;
}

function parseClientDate(raw: string | undefined): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return new Date().toISOString().split('T')[0]!;
}

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('my/summary')
  getMySummary(
    @CurrentUser() user: AccessTokenPayload,
    @Query('year') yearStr?: string,
    @Query('month') monthStr?: string,
    @Query('clientDate') clientDateStr?: string,
  ): Promise<YearlySummary | MonthlySummary> {
    const year = parseYear(yearStr);
    const month = parseMonth(monthStr);
    const clientDate = parseClientDate(clientDateStr);
    if (month !== undefined) {
      return this.reportsService.getMonthlySummary(user.sub, user.organizationId, year, month, clientDate);
    }
    return this.reportsService.getYearlySummary(user.sub, user.organizationId, year, clientDate);
  }

  @Get('summary/:userId')
  @Roles('admin', 'hr', 'manager')
  getUserSummary(
    @Param('userId') userId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Query('year') yearStr?: string,
    @Query('month') monthStr?: string,
    @Query('clientDate') clientDateStr?: string,
  ): Promise<YearlySummary | MonthlySummary> {
    const year = parseYear(yearStr);
    const month = parseMonth(monthStr);
    const clientDate = parseClientDate(clientDateStr);
    if (month !== undefined) {
      return this.reportsService.getMonthlySummary(userId, user.organizationId, year, month, clientDate);
    }
    return this.reportsService.getYearlySummary(userId, user.organizationId, year, clientDate);
  }
}
