import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { User } from '@hecto/database';
import { AuthService } from './auth.service';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    organizationId: 'org-1',
    email: 'user@example.com',
    username: null,
    passwordHash: 'hash',
    role: 'employee',
    firstName: null,
    lastName: null,
    isActive: true,
    dateJoined: new Date(),
    lastLogin: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

function makeService(overrides: {
  user?: User | null;
  org?: { id: string; isActive: boolean; deletedAt: Date | null } | undefined;
}) {
  const usersService = {
    validateCredentials: jest.fn().mockResolvedValue(overrides.user ?? null),
    updateLastLogin: jest.fn().mockResolvedValue(undefined),
    toPublic: jest.fn().mockImplementation((u: User) => ({ id: u.id, email: u.email })),
  };
  const sessionsRepository = {
    create: jest.fn().mockResolvedValue({ id: 'session-1' }),
  };
  const organizationsRepository = {
    findById: jest.fn().mockResolvedValue(overrides.org),
  };
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('token'),
  };
  const configService = {
    get: jest.fn().mockReturnValue(undefined),
    getOrThrow: jest.fn().mockReturnValue('secret'),
  };

  const service = new AuthService(
    jwtService as never,
    configService as never,
    usersService as never,
    sessionsRepository as never,
    {} as never, // emailVerificationRepository
    organizationsRepository as never,
    {} as never, // passwordResetsRepository
    {} as never, // tasksQueueService
  );

  return { service, usersService, organizationsRepository, sessionsRepository };
}

function makeReqRes(): { req: Request; res: Response } {
  const req = {
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
    cookies: {},
  } as unknown as Request;
  const res = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;
  return { req, res };
}

const dto = { email: 'user@example.com', password: 'pw' };

describe('AuthService.login organization checks', () => {
  it('rejects invalid credentials', async () => {
    const { service } = makeService({ user: null });
    const { req, res } = makeReqRes();
    await expect(service.login(dto, req, res)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a disabled user before touching the organization', async () => {
    const { service, organizationsRepository } = makeService({
      user: makeUser({ isActive: false }),
    });
    const { req, res } = makeReqRes();
    await expect(service.login(dto, req, res)).rejects.toThrow(ForbiddenException);
    expect(organizationsRepository.findById).not.toHaveBeenCalled();
  });

  it('rejects login when the organization is disabled', async () => {
    const { service } = makeService({
      user: makeUser(),
      org: { id: 'org-1', isActive: false, deletedAt: null },
    });
    const { req, res } = makeReqRes();
    await expect(service.login(dto, req, res)).rejects.toThrow(ForbiddenException);
  });

  it('rejects login when the organization is soft-deleted', async () => {
    const { service } = makeService({
      user: makeUser(),
      org: { id: 'org-1', isActive: true, deletedAt: new Date() },
    });
    const { req, res } = makeReqRes();
    await expect(service.login(dto, req, res)).rejects.toThrow(ForbiddenException);
  });

  it('rejects login when the organization no longer exists', async () => {
    const { service } = makeService({ user: makeUser(), org: undefined });
    const { req, res } = makeReqRes();
    await expect(service.login(dto, req, res)).rejects.toThrow(ForbiddenException);
  });

  it('allows login when the organization is active', async () => {
    const { service, sessionsRepository } = makeService({
      user: makeUser(),
      org: { id: 'org-1', isActive: true, deletedAt: null },
    });
    const { req, res } = makeReqRes();
    const result = await service.login(dto, req, res);
    expect(result.accessToken).toBe('token');
    expect(sessionsRepository.create).toHaveBeenCalled();
  });

  it('skips the organization check for org-less users (superadmin)', async () => {
    const { service, organizationsRepository } = makeService({
      user: makeUser({ organizationId: null, role: 'superadmin' }),
    });
    const { req, res } = makeReqRes();
    const result = await service.login(dto, req, res);
    expect(result.accessToken).toBe('token');
    expect(organizationsRepository.findById).not.toHaveBeenCalled();
  });
});
