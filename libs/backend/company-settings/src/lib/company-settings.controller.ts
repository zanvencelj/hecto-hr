import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import type { AccessTokenPayload, CompanySettingsPublic } from '@hecto/shared-types';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@hecto/auth';
import { CompanySettingsService } from './company-settings.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

@Controller('company-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanySettingsController {
  constructor(private readonly companySettingsService: CompanySettingsService) {}

  @Get()
  get(@CurrentUser() user: AccessTokenPayload): Promise<CompanySettingsPublic> {
    return this.companySettingsService.getSettings(user);
  }

  @Put()
  @Roles('admin', 'hr')
  update(
    @Body() dto: UpdateCompanySettingsDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<CompanySettingsPublic> {
    return this.companySettingsService.updateSettings(dto, user);
  }
}
