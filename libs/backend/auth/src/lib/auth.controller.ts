import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type {
  AccessTokenPayload,
  LoginResponse,
  RefreshResponse,
  SessionInfo,
  RegistrationInitiatedResponse,
  ResendCodeResponse,
  ForgotPasswordResponse,
} from '@hecto/shared-types';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailCodeDto } from './dto/verify-email-code.dto';
import { ResendVerificationCodeDto } from './dto/resend-verification-code.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.ACCEPTED)
  register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ): Promise<RegistrationInitiatedResponse> {
    return this.authService.initiateRegistration(dto, req);
  }

  @Public()
  @Post('register/verify')
  @HttpCode(HttpStatus.CREATED)
  verifyEmailCode(
    @Body() dto: VerifyEmailCodeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    return this.authService.verifyEmailCode(dto, req, res);
  }

  @Public()
  @Post('register/resend-code')
  @HttpCode(HttpStatus.OK)
  resendVerificationCode(
    @Body() dto: ResendVerificationCodeDto,
  ): Promise<ResendCodeResponse> {
    return this.authService.resendVerificationCode(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    return this.authService.login(dto, req, res);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResponse> {
    return this.authService.refresh(req, res, dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(
    @Body() dto: LogoutDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.authService.logout(req, res, dto.refreshToken);
  }

  @Public()
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  logoutAll(
    @Body() dto: LogoutDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.authService.logoutAll(req, res, dto.refreshToken);
  }

  @Get('sessions')
  getSessions(@CurrentUser() user: AccessTokenPayload): Promise<SessionInfo[]> {
    return this.authService.getSessions(user.sub, user.sessionId);
  }

  @Public()
  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<ForgotPasswordResponse> {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(
    @CurrentUser() user: AccessTokenPayload,
    @Param('sessionId') sessionId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    if (sessionId === user.sessionId) {
      return this.authService.logoutSession(sessionId, res);
    }
    return this.authService.revokeSession(sessionId);
  }
}
