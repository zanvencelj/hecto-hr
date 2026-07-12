import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AdminAuthService } from './admin-auth.service';

const req = {} as Request;
const res = {} as Response;
const dto = { email: 'admin@hecto.io', password: 'pw' };

function makeService(user: { role: string } | null) {
  const authService = {
    login: jest.fn().mockResolvedValue({ accessToken: 'token' }),
  };
  const usersService = {
    findByEmail: jest.fn().mockResolvedValue(user),
  };
  const service = new AdminAuthService(authService as never, usersService as never);
  return { service, authService };
}

describe('AdminAuthService.login', () => {
  it('rejects unknown emails without revealing whether the account exists', async () => {
    const { service, authService } = makeService(null);
    await expect(service.login(dto, req, res)).rejects.toThrow(UnauthorizedException);
    expect(authService.login).not.toHaveBeenCalled();
  });

  it.each(['admin', 'hr', 'manager', 'employee'])(
    'rejects %s accounts on the admin login endpoint',
    async (role) => {
      const { service, authService } = makeService({ role });
      await expect(service.login(dto, req, res)).rejects.toThrow(UnauthorizedException);
      expect(authService.login).not.toHaveBeenCalled();
    },
  );

  it('delegates superadmin logins to the shared AuthService', async () => {
    const { service, authService } = makeService({ role: 'superadmin' });
    const result = await service.login(dto, req, res);
    expect(result).toEqual({ accessToken: 'token' });
    expect(authService.login).toHaveBeenCalledWith(dto, req, res);
  });
});
