import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AccessTokenPayload } from '@hecto/shared-types';
import { RolesGuard } from './roles.guard';

function makeContext(user?: Partial<AccessTokenPayload>): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  function makeGuard(required?: string[]): RolesGuard {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(required),
    } as unknown as Reflector;
    return new RolesGuard(reflector);
  }

  it('allows any request when no roles are required', () => {
    const guard = makeGuard(undefined);
    expect(guard.canActivate(makeContext({ role: 'employee' }))).toBe(true);
  });

  it('allows a superadmin through a superadmin-only endpoint', () => {
    const guard = makeGuard(['superadmin']);
    expect(guard.canActivate(makeContext({ role: 'superadmin' }))).toBe(true);
  });

  it.each(['admin', 'hr', 'manager', 'employee'] as const)(
    'rejects role %s on a superadmin-only endpoint',
    (role) => {
      const guard = makeGuard(['superadmin']);
      expect(() => guard.canActivate(makeContext({ role }))).toThrow(ForbiddenException);
    },
  );

  it('rejects an unauthenticated request on a role-protected endpoint', () => {
    const guard = makeGuard(['superadmin']);
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });

  it('does not let an org admin through a superadmin-only endpoint', () => {
    const guard = makeGuard(['superadmin']);
    expect(() => guard.canActivate(makeContext({ role: 'admin' }))).toThrow(
      ForbiddenException,
    );
  });
});
