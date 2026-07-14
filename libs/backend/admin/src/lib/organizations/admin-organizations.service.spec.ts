import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AdminOrganizationsService } from './admin-organizations.service';
import type { OrganizationWithUserCount } from './admin-organizations.repository';

function makeOrg(overrides: Partial<OrganizationWithUserCount> = {}): OrganizationWithUserCount {
  return {
    id: 'org-1',
    name: 'Acme',
    slug: 'acme',
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    userCount: 3,
    ...overrides,
  };
}

function makeService(org: OrganizationWithUserCount | undefined, slugTaken = false) {
  const orgsRepository = {
    list: jest.fn(),
    findById: jest.fn().mockResolvedValue(org),
    isSlugTakenByOther: jest.fn().mockResolvedValue(slugTaken),
    update: jest.fn().mockImplementation((id: string, data: Record<string, unknown>) =>
      Promise.resolve({ ...makeOrg(), ...data }),
    ),
  };
  const auditService = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  const service = new AdminOrganizationsService(
    orgsRepository as never,
    auditService as never,
    {} as never, // db — only needed by listEntities, not under test here
  );
  return { service, orgsRepository, auditService };
}

const ADMIN_ID = 'superadmin-1';

describe('AdminOrganizationsService', () => {
  it('throws NotFound for a missing organization', async () => {
    const { service } = makeService(undefined);
    await expect(service.disable('nope', ADMIN_ID)).rejects.toThrow(NotFoundException);
  });

  describe('disable/enable', () => {
    it('disable sets isActive false and audits the change', async () => {
      const { service, orgsRepository, auditService } = makeService(makeOrg());
      await service.disable('org-1', ADMIN_ID);

      expect(orgsRepository.update).toHaveBeenCalledWith('org-1', { isActive: false });
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          adminUserId: ADMIN_ID,
          action: 'organization.disable',
          entityType: 'organization',
          entityId: 'org-1',
          before: { isActive: true },
          after: { isActive: false },
        }),
      );
    });

    it('enable is a no-op when the org is already active', async () => {
      const { service, orgsRepository, auditService } = makeService(makeOrg());
      await service.enable('org-1', ADMIN_ID);

      expect(orgsRepository.update).not.toHaveBeenCalled();
      expect(auditService.record).not.toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('sets deletedAt, deactivates the org, and audits', async () => {
      const { service, orgsRepository, auditService } = makeService(makeOrg());
      await service.softDelete('org-1', ADMIN_ID);

      expect(orgsRepository.update).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({ isActive: false, deletedAt: expect.any(Date) }),
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'organization.soft_delete' }),
      );
    });

    it('rejects double deletion', async () => {
      const { service } = makeService(makeOrg({ deletedAt: new Date() }));
      await expect(service.softDelete('org-1', ADMIN_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('restore', () => {
    it('clears deletedAt and re-enables the org', async () => {
      const { service, orgsRepository } = makeService(
        makeOrg({ deletedAt: new Date(), isActive: false }),
      );
      await service.restore('org-1', ADMIN_ID);

      expect(orgsRepository.update).toHaveBeenCalledWith('org-1', {
        deletedAt: null,
        isActive: true,
      });
    });

    it('rejects restoring an org that is not deleted', async () => {
      const { service } = makeService(makeOrg());
      await expect(service.restore('org-1', ADMIN_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('rejects a slug already used by another organization', async () => {
      const { service } = makeService(makeOrg(), true);
      await expect(
        service.update('org-1', { slug: 'taken' }, ADMIN_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('audits the changed fields with before values', async () => {
      const { service, auditService } = makeService(makeOrg());
      await service.update('org-1', { name: 'New Name' }, ADMIN_ID);

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'organization.update',
          before: { name: 'Acme' },
          after: { name: 'New Name' },
        }),
      );
    });

    it('skips the update entirely when nothing changed', async () => {
      const { service, orgsRepository, auditService } = makeService(makeOrg());
      await service.update('org-1', { name: 'Acme', slug: 'acme' }, ADMIN_ID);

      expect(orgsRepository.update).not.toHaveBeenCalled();
      expect(auditService.record).not.toHaveBeenCalled();
    });
  });
});
