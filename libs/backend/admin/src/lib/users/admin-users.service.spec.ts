import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import type { AdminUserRow } from './admin-users.repository';

function makeRow(overrides: Partial<AdminUserRow> = {}): AdminUserRow {
  return {
    id: 'user-1',
    organizationId: 'org-1',
    organizationName: 'Acme',
    email: 'user@example.com',
    username: null,
    firstName: null,
    lastName: null,
    role: 'employee',
    isActive: true,
    deletedAt: null,
    dateJoined: new Date(),
    lastLogin: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeService(row: AdminUserRow | undefined) {
  const usersRepository = {
    list: jest.fn(),
    findById: jest.fn().mockResolvedValue(row),
    update: jest.fn().mockResolvedValue(undefined),
    listSessions: jest.fn().mockResolvedValue([]),
    deactivateAllSessions: jest.fn().mockResolvedValue(undefined),
  };
  const authService = {
    forgotPassword: jest.fn().mockResolvedValue({ message: 'sent' }),
  };
  const auditService = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  const service = new AdminUsersService(
    usersRepository as never,
    authService as never,
    auditService as never,
  );
  return { service, usersRepository, authService, auditService };
}

const ADMIN_ID = 'superadmin-1';

describe('AdminUsersService', () => {
  it('throws NotFound for a missing user', async () => {
    const { service } = makeService(undefined);
    await expect(service.disable('nope', ADMIN_ID)).rejects.toThrow(NotFoundException);
  });

  describe('superadmin protection', () => {
    it.each(['disable', 'enable', 'softDelete', 'restore', 'revokeSessions', 'forcePasswordReset'] as const)(
      'refuses to %s a superadmin account',
      async (method) => {
        const { service } = makeService(makeRow({ role: 'superadmin' }));
        await expect(service[method]('user-1', ADMIN_ID)).rejects.toThrow(ForbiddenException);
      },
    );

    it('refuses to update a superadmin account', async () => {
      const { service } = makeService(makeRow({ role: 'superadmin' }));
      await expect(
        service.update('user-1', { firstName: 'X' }, ADMIN_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('softDelete', () => {
    it('marks the user deleted, deactivates them, and revokes all sessions', async () => {
      const { service, usersRepository } = makeService(makeRow());
      await service.softDelete('user-1', ADMIN_ID);

      expect(usersRepository.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ isActive: false, deletedAt: expect.any(Date) }),
      );
      expect(usersRepository.deactivateAllSessions).toHaveBeenCalledWith('user-1');
    });

    it('writes an audit entry', async () => {
      const { service, auditService } = makeService(makeRow());
      await service.softDelete('user-1', ADMIN_ID);

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          adminUserId: ADMIN_ID,
          action: 'user.soft_delete',
          entityType: 'user',
          entityId: 'user-1',
          organizationId: 'org-1',
        }),
      );
    });

    it('rejects double deletion', async () => {
      const { service } = makeService(makeRow({ deletedAt: new Date() }));
      await expect(service.softDelete('user-1', ADMIN_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('restore', () => {
    it('clears deletedAt and re-enables the user', async () => {
      const { service, usersRepository } = makeService(
        makeRow({ deletedAt: new Date(), isActive: false }),
      );
      await service.restore('user-1', ADMIN_ID);

      expect(usersRepository.update).toHaveBeenCalledWith('user-1', {
        deletedAt: null,
        isActive: true,
      });
    });

    it('rejects restoring a user that is not deleted', async () => {
      const { service } = makeService(makeRow());
      await expect(service.restore('user-1', ADMIN_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('disable/enable', () => {
    it('disable writes an audit entry with the isActive diff', async () => {
      const { service, usersRepository, auditService } = makeService(makeRow());
      await service.disable('user-1', ADMIN_ID);

      expect(usersRepository.update).toHaveBeenCalledWith('user-1', { isActive: false });
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.disable',
          before: { isActive: true },
          after: { isActive: false },
        }),
      );
    });

    it('is a no-op when the state already matches', async () => {
      const { service, usersRepository, auditService } = makeService(makeRow());
      await service.enable('user-1', ADMIN_ID);

      expect(usersRepository.update).not.toHaveBeenCalled();
      expect(auditService.record).not.toHaveBeenCalled();
    });
  });

  describe('revokeSessions', () => {
    it('deactivates all sessions and records the action', async () => {
      const { service, usersRepository, auditService } = makeService(makeRow());
      await service.revokeSessions('user-1', ADMIN_ID);

      expect(usersRepository.deactivateAllSessions).toHaveBeenCalledWith('user-1');
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.revoke_sessions' }),
      );
    });
  });

  describe('forcePasswordReset', () => {
    it('sends the reset email through the shared auth flow and records the action', async () => {
      const { service, authService, auditService } = makeService(makeRow());
      await service.forcePasswordReset('user-1', ADMIN_ID);

      expect(authService.forgotPassword).toHaveBeenCalledWith('user@example.com');
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.force_password_reset' }),
      );
    });

    it('refuses for deleted users', async () => {
      const { service } = makeService(makeRow({ deletedAt: new Date() }));
      await expect(service.forcePasswordReset('user-1', ADMIN_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
