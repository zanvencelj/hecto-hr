import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { AccessTokenPayload } from '@hecto/shared-types';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ACCESS_TOKEN_COOKIE, ADMIN_ACCESS_TOKEN_COOKIE } from '../cookie-names';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AccessTokenPayload }>();
    const token = this.extractToken(request);

    if (!token) throw new UnauthorizedException('No access token provided');

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
      request.user = payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    return true;
  }

  private extractToken(request: Request): string | undefined {
    // SPA clients always attach the in-memory token as a Bearer header — trust it
    // over any cookie, since both the admin and manager apps share one cookie jar
    // (same backend origin, port isn't part of cookie scoping) and a stale cookie
    // from the other app must never override the caller's own token.
    const [type, headerToken] = request.headers.authorization?.split(' ') ?? [];
    if (type === 'Bearer' && headerToken) return headerToken;

    const isAdminRoute = request.path.startsWith('/api/admin/');
    const cookieName = isAdminRoute ? ADMIN_ACCESS_TOKEN_COOKIE : ACCESS_TOKEN_COOKIE;
    return (request.cookies as Record<string, string> | undefined)?.[cookieName];
  }
}
