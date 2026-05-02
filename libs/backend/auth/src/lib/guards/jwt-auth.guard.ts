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
    const fromCookie = (request.cookies as Record<string, string> | undefined)?.['access_token'];
    if (fromCookie) return fromCookie;

    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
