import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { LoginResponse } from '@hecto/shared-types';
import { JwtAuthGuard, Public } from '@hecto/auth';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from '../dto/admin-login.dto';

@Controller('admin/auth')
@UseGuards(JwtAuthGuard)
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body() dto: AdminLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    return this.adminAuthService.login(dto, req, res);
  }
}
