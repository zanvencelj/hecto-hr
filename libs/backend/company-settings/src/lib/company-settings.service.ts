import { Injectable, NotFoundException } from '@nestjs/common';
import type { AccessTokenPayload, CompanySettingsPublic } from '@hecto/shared-types';
import type { CompanySettings } from '@hecto/database';
import { CompanySettingsRepository } from './company-settings.repository';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

export const COMPANY_SETTINGS_DEFAULTS = {
  weekendDays: [0, 6],
  unpaidBreakThresholdMinutes: 60,
};

@Injectable()
export class CompanySettingsService {
  constructor(private readonly repo: CompanySettingsRepository) {}

  async getSettings(currentUser: AccessTokenPayload): Promise<CompanySettingsPublic> {
    const [name, settings] = await Promise.all([
      this.repo.findOrganizationName(currentUser.organizationId),
      this.repo.findSettings(currentUser.organizationId),
    ]);
    if (name === undefined) throw new NotFoundException('Organization not found');
    return this.toPublic(currentUser.organizationId, name, settings);
  }

  async updateSettings(
    dto: UpdateCompanySettingsDto,
    currentUser: AccessTokenPayload,
  ): Promise<CompanySettingsPublic> {
    await this.repo.updateOrganizationName(currentUser.organizationId, dto.name);
    const settings = await this.repo.upsertSettings(currentUser.organizationId, {
      weekendDays: dto.weekendDays,
      unpaidBreakThresholdMinutes: dto.unpaidBreakThresholdMinutes,
    });
    return this.toPublic(currentUser.organizationId, dto.name, settings);
  }

  private toPublic(
    organizationId: string,
    name: string,
    settings: CompanySettings | null,
  ): CompanySettingsPublic {
    return {
      organizationId,
      name,
      weekendDays: settings?.weekendDays ?? COMPANY_SETTINGS_DEFAULTS.weekendDays,
      unpaidBreakThresholdMinutes:
        settings?.unpaidBreakThresholdMinutes ?? COMPANY_SETTINGS_DEFAULTS.unpaidBreakThresholdMinutes,
    };
  }
}
