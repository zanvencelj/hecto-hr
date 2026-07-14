import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

function makeContext(req: {
  path: string;
  cookies?: Record<string, string>;
  authorization?: string;
}): ExecutionContext {
  const request = {
    path: req.path,
    cookies: req.cookies ?? {},
    headers: req.authorization ? { authorization: req.authorization } : {},
  };
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function makeGuard(verifiedToken: string) {
  const jwtService = {
    verifyAsync: jest.fn(async (token: string) => {
      if (token !== verifiedToken) throw new Error('invalid token');
      return { sub: 'user-1', role: 'employee' };
    }),
  };
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as Reflector;
  return new JwtAuthGuard(jwtService as never, reflector);
}

describe('JwtAuthGuard token extraction', () => {
  it('trusts the Bearer header over any cookie, even on a non-admin route', async () => {
    const guard = makeGuard('header-token');
    const ctx = makeContext({
      path: '/api/users/me',
      cookies: { access_token: 'stale-manager-cookie' },
      authorization: 'Bearer header-token',
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('reads the admin cookie for admin routes when no header is present', async () => {
    const guard = makeGuard('admin-cookie-token');
    const ctx = makeContext({
      path: '/api/admin/users',
      cookies: { access_token: 'wrong-scope', admin_access_token: 'admin-cookie-token' },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('reads the regular cookie for non-admin routes and ignores the admin cookie', async () => {
    const guard = makeGuard('user-cookie-token');
    const ctx = makeContext({
      path: '/api/users/me',
      cookies: { access_token: 'user-cookie-token', admin_access_token: 'wrong-scope' },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('rejects when the only cookie present is scoped to the other app', async () => {
    const guard = makeGuard('admin-cookie-token');
    const ctx = makeContext({
      path: '/api/admin/users',
      cookies: { access_token: 'admin-cookie-token' },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
