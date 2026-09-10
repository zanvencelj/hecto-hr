import { NotFoundException } from '@nestjs/common';
import type { AccessTokenPayload } from '@hecto/shared-types';
import type { CompanySettings } from '@hecto/database';
import { CompanySettingsService, COMPANY_SETTINGS_DEFAULTS } from './company-settings.service';
import type { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

function makeSettings(overrides: Partial<CompanySettings> = {}): CompanySettings {
  return {
    organizationId: 'org-1',
    weekendDays: [0, 6],
    unpaidBreakThresholdMinutes: 60,
    updatedAt: new Date(),
    ...overrides,
  } as CompanySettings;
}

function makeService(name: string | undefined, settings: CompanySettings | null) {
  const repo = {
    findOrganizationName: jest.fn().mockResolvedValue(name),
    updateOrganizationName: jest.fn().mockResolvedValue(undefined),
    findSettings: jest.fn().mockResolvedValue(settings),
    upsertSettings: jest.fn().mockImplementation((organizationId: string, data: Partial<CompanySettings>) =>
      Promise.resolve(makeSettings({ organizationId, ...data })),
    ),
  };
  const service = new CompanySettingsService(repo as never);
  return { service, repo };
}

const CURRENT_USER = { organizationId: 'org-1' } as AccessTokenPayload;

describe('CompanySettingsService', () => {
  describe('getSettings', () => {
    it('throws NotFound when the organization does not exist', async () => {
      const { service } = makeService(undefined, null);
      await expect(service.getSettings(CURRENT_USER)).rejects.toThrow(NotFoundException);
    });

    it('falls back to defaults when no settings row exists yet', async () => {
      const { service } = makeService('Acme', null);
      const result = await service.getSettings(CURRENT_USER);

      expect(result).toEqual({
        organizationId: 'org-1',
        name: 'Acme',
        weekendDays: COMPANY_SETTINGS_DEFAULTS.weekendDays,
        unpaidBreakThresholdMinutes: COMPANY_SETTINGS_DEFAULTS.unpaidBreakThresholdMinutes,
      });
    });

    it('returns the stored settings when a row exists', async () => {
      const { service } = makeService('Acme', makeSettings({ weekendDays: [5, 6], unpaidBreakThresholdMinutes: 30 }));
      const result = await service.getSettings(CURRENT_USER);

      expect(result).toEqual({
        organizationId: 'org-1',
        name: 'Acme',
        weekendDays: [5, 6],
        unpaidBreakThresholdMinutes: 30,
      });
    });
  });

  describe('updateSettings', () => {
    const dto: UpdateCompanySettingsDto = {
      name: 'New Name',
      weekendDays: [0, 1],
      unpaidBreakThresholdMinutes: 45,
    };

    it('updates the organization name and upserts settings', async () => {
      const { service, repo } = makeService('Acme', makeSettings());
      await service.updateSettings(dto, CURRENT_USER);

      expect(repo.updateOrganizationName).toHaveBeenCalledWith('org-1', 'New Name');
      expect(repo.upsertSettings).toHaveBeenCalledWith('org-1', {
        weekendDays: [0, 1],
        unpaidBreakThresholdMinutes: 45,
      });
    });

    it('returns the public shape built from the updated dto and settings', async () => {
      const { service } = makeService('Acme', makeSettings());
      const result = await service.updateSettings(dto, CURRENT_USER);

      expect(result).toEqual({
        organizationId: 'org-1',
        name: 'New Name',
        weekendDays: [0, 1],
        unpaidBreakThresholdMinutes: 45,
      });
    });
  });
});
