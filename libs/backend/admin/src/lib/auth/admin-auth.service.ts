import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { LoginResponse, RefreshResponse } from '@hecto/shared-types';
import { AuthService } from '@hecto/auth';
import { UsersService } from '@hecto/users';
import { AdminLoginDto } from '../dto/admin-login.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  async login(dto: AdminLoginDto, req: Request, res: Response): Promise<LoginResponse> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || user.role !== 'superadmin') {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.authService.login(dto, req, res, 'admin');
  }

  refresh(req: Request, res: Response): Promise<RefreshResponse> {
    return this.authService.refresh(req, res, undefined, 'admin');
  }

  logout(req: Request, res: Response): Promise<void> {
    return this.authService.logout(req, res, undefined, 'admin');
  }
}
