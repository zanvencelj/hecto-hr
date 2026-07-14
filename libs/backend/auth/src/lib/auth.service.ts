import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual, randomBytes, randomInt } from 'crypto';
import * as argon2 from 'argon2';
import type { Request, Response } from 'express';
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
  LoginResponse,
  RefreshResponse,
  SessionInfo,
  RegistrationInitiatedResponse,
  ResendCodeResponse,
  ForgotPasswordResponse,
  UserRole,
} from '@hecto/shared-types';
import { UsersService } from '@hecto/users';
import { TasksQueueService } from '@hecto/queue';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailCodeDto } from './dto/verify-email-code.dto';
import { ResendVerificationCodeDto } from './dto/resend-verification-code.dto';
import { SessionsRepository } from './sessions.repository';
import { EmailVerificationRepository } from './email-verification.repository';
import { OrganizationsRepository } from './organizations.repository';
import { PasswordResetsRepository } from './password-resets.repository';
import { accessTokenCookieName, refreshTokenCookieName, type AuthScope } from './cookie-names';

const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_RESENDS = 3;
const MAX_WRONG_ATTEMPTS = 5;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly isProd: boolean;
  private readonly accessExpiry: string;
  private readonly refreshExpiry: string;
  private readonly accessExpirySeconds: number;
  private readonly refreshExpirySeconds: number;
  private readonly refreshExpiryMs: number;
  private readonly otpSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => UsersService)) private readonly usersService: UsersService,
    private readonly sessionsRepository: SessionsRepository,
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly passwordResetsRepository: PasswordResetsRepository,
    private readonly tasksQueueService: TasksQueueService,
  ) {
    this.isProd = configService.get('NODE_ENV') === 'production';
    this.accessExpiry = configService.get('JWT_ACCESS_EXPIRY') ?? '15m';
    this.refreshExpiry = configService.get('JWT_REFRESH_EXPIRY') ?? '7d';
    this.accessExpirySeconds = Math.floor(parseDurationToMs(this.accessExpiry) / 1000);
    this.refreshExpirySeconds = Math.floor(parseDurationToMs(this.refreshExpiry) / 1000);
    this.refreshExpiryMs = parseDurationToMs(this.refreshExpiry);
    this.otpSecret = configService.getOrThrow('EMAIL_VERIFICATION_SECRET');
  }

  async login(dto: LoginDto, req: Request, res: Response, scope: AuthScope = 'user'): Promise<LoginResponse> {
    const user = await this.usersService.validateCredentials(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Invalid email or password');
    if (!user.isActive) throw new ForbiddenException('Account is disabled');

    if (user.organizationId) {
      const org = await this.organizationsRepository.findById(user.organizationId);
      if (!org || org.deletedAt || !org.isActive) {
        throw new ForbiddenException('Organization is disabled');
      }
    }

    const expiresAt = new Date(Date.now() + this.refreshExpiryMs);
    const session = await this.sessionsRepository.create({
      userId: user.id,
      organizationId: user.organizationId ?? null,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] ?? null,
      deviceName: dto.deviceName ?? detectDevice(req.headers['user-agent']),
      platform: detectPlatform(req),
      expiresAt,
    });

    const { accessToken, refreshToken } = await this.issueTokens(
      user.id,
      user.email,
      user.organizationId ?? '',
      user.role,
      session.id,
    );

    this.setAuthCookies(res, accessToken, refreshToken, scope);
    await this.usersService.updateLastLogin(user.id);

    return {
      user: this.usersService.toPublic(user),
      accessToken,
      refreshToken,
    };
  }

  async initiateRegistration(
    dto: RegisterDto,
    req: Request,
  ): Promise<RegistrationInitiatedResponse> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
    const code = generateOtpCode();
    const codeHash = this.hashOtpCode(code);
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);

    await this.emailVerificationRepository.upsertForEmail({
      email: dto.email.toLowerCase(),
      codeHash,
      pendingData: {
        passwordHash,
        organizationName: dto.organizationName,
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
        deviceName: dto.deviceName ?? null,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] ?? null,
      },
      expiresAt,
    });

    void this.tasksQueueService
      .sendVerificationEmail(dto.email, code, dto.firstName ?? null)
      .catch((err: unknown) => {
        this.logger.warn('Failed to enqueue verification email', err);
      });

    return {
      message: 'Verification code sent. Please check your email.',
      email: maskEmail(dto.email),
      expiresAt: expiresAt.toISOString(),
    };
  }

  async verifyEmailCode(
    dto: VerifyEmailCodeDto,
    req: Request,
    res: Response,
  ): Promise<LoginResponse> {
    const verification = await this.emailVerificationRepository.findActiveByEmail(
      dto.email.toLowerCase(),
    );

    if (!verification) {
      throw new NotFoundException(
        'No pending verification found for this email. Please register again.',
      );
    }

    if (verification.wrongAttempts >= MAX_WRONG_ATTEMPTS) {
      await this.emailVerificationRepository.delete(verification.id);
      throw new BadRequestException(
        'Too many incorrect attempts. Please restart registration.',
      );
    }

    const computedHash = this.hashOtpCode(dto.code);
    const expected = Buffer.from(verification.codeHash, 'hex');
    const actual = Buffer.from(computedHash, 'hex');
    const isValid =
      expected.length === actual.length && timingSafeEqual(expected, actual);

    if (!isValid) {
      const updated = await this.emailVerificationRepository.incrementWrongAttempts(verification.id);
      const attemptsLeft = MAX_WRONG_ATTEMPTS - updated.wrongAttempts;
      throw new BadRequestException(
        attemptsLeft > 0
          ? `Incorrect code. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`
          : 'Too many incorrect attempts. Please restart registration.',
      );
    }

    const { pendingData } = verification;
    const slug = await this.resolveUniqueSlug(pendingData.organizationName);
    const org = await this.organizationsRepository.create({
      name: pendingData.organizationName,
      slug,
    });

    const user = await this.usersService.createFromVerifiedEmail({
      email: verification.email,
      passwordHash: pendingData.passwordHash,
      organizationId: org.id,
      role: 'admin',
      firstName: pendingData.firstName,
      lastName: pendingData.lastName,
    });

    const expiresAt = new Date(Date.now() + this.refreshExpiryMs);
    const session = await this.sessionsRepository.create({
      userId: user.id,
      organizationId: org.id,
      ipAddress: pendingData.ipAddress ?? getClientIp(req),
      userAgent: pendingData.userAgent ?? req.headers['user-agent'] ?? null,
      deviceName: pendingData.deviceName ?? detectDevice(req.headers['user-agent']),
      platform: detectPlatform(req),
      expiresAt,
    });

    const { accessToken, refreshToken } = await this.issueTokens(
      user.id,
      user.email,
      org.id,
      'admin',
      session.id,
    );

    this.setAuthCookies(res, accessToken, refreshToken, 'user');

    await this.emailVerificationRepository.delete(verification.id);

    void this.tasksQueueService
      .sendWelcomeEmail(user.email, user.firstName)
      .catch((err: unknown) => {
        this.logger.warn('Failed to enqueue welcome email', err);
      });

    return { user, accessToken, refreshToken };
  }

  async resendVerificationCode(dto: ResendVerificationCodeDto): Promise<ResendCodeResponse> {
    const verification = await this.emailVerificationRepository.findActiveByEmail(
      dto.email.toLowerCase(),
    );

    if (!verification) {
      throw new NotFoundException(
        'No pending verification found for this email. Please register again.',
      );
    }

    if (verification.resendCount >= MAX_RESENDS) {
      throw new HttpException(
        'Maximum resend limit reached. Please restart registration.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (verification.lastResentAt) {
      const elapsed = Date.now() - verification.lastResentAt.getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const retryAfterMs = RESEND_COOLDOWN_MS - elapsed;
        const nextResendAvailableAt = new Date(Date.now() + retryAfterMs).toISOString();
        throw new HttpException(
          { message: 'Please wait before requesting another code.', nextResendAvailableAt },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const code = generateOtpCode();
    const codeHash = this.hashOtpCode(code);
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);

    const updated = await this.emailVerificationRepository.updateForResend(
      verification.id,
      codeHash,
      expiresAt,
    );

    const firstName = verification.pendingData.firstName;
    void this.tasksQueueService
      .sendVerificationEmail(verification.email, code, firstName)
      .catch((err: unknown) => {
        this.logger.warn('Failed to enqueue resend verification email', err);
      });

    const remainingResends = MAX_RESENDS - updated.resendCount;
    const nextResendAvailableAt =
      remainingResends > 0
        ? new Date(Date.now() + RESEND_COOLDOWN_MS).toISOString()
        : null;

    return {
      message: 'Verification code resent. Please check your email.',
      resentCount: updated.resendCount,
      nextResendAvailableAt,
    };
  }

  async refresh(
    req: Request,
    res: Response,
    bodyToken?: string,
    scope: AuthScope = 'user',
  ): Promise<RefreshResponse> {
    const token =
      bodyToken ??
      (req.cookies as Record<string, string> | undefined)?.[refreshTokenCookieName(scope)];

    if (!token) throw new UnauthorizedException('No refresh token provided');

    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid token type');

    const session = await this.sessionsRepository.findActiveById(payload.sessionId);
    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException('Session not found or revoked');
    }
    if (session.expiresAt < new Date()) {
      await this.sessionsRepository.deactivate(session.id);
      throw new UnauthorizedException('Session expired, please log in again');
    }

    const user = await this.usersService.findById(payload.sub);
    await this.sessionsRepository.touch(session.id);

    const { accessToken } = await this.issueTokens(
      user.id,
      user.email,
      user.organizationId ?? '',
      user.role,
      session.id,
    );

    this.setAccessCookie(res, accessToken, scope);
    return { accessToken };
  }

  async logout(req: Request, res: Response, bodyToken?: string, scope: AuthScope = 'user'): Promise<void> {
    const token =
      bodyToken ?? (req.cookies as Record<string, string>)?.[refreshTokenCookieName(scope)];
    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
          secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
        });
        await this.sessionsRepository.deactivate(payload.sessionId);
      } catch {
        // Expired or invalid refresh token — session cleared best-effort
      }
    }
    this.clearAuthCookies(res, scope);
  }

  async logoutAll(req: Request, res: Response, bodyToken?: string, scope: AuthScope = 'user'): Promise<void> {
    const token =
      bodyToken ?? (req.cookies as Record<string, string>)?.[refreshTokenCookieName(scope)];
    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
          secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
        });
        await this.sessionsRepository.deactivateAllForUser(payload.sub);
      } catch {
        // Expired or invalid refresh token — session cleared best-effort
      }
    }
    this.clearAuthCookies(res, scope);
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionsRepository.deactivate(sessionId);
  }

  async logoutSession(sessionId: string, res: Response): Promise<void> {
    await this.sessionsRepository.deactivate(sessionId);
    this.clearAuthCookies(res, 'user');
  }

  async getSessions(userId: string, currentSessionId: string): Promise<SessionInfo[]> {
    const activeSessions = await this.sessionsRepository.findAllActiveByUserId(userId);
    return activeSessions.map((s) => ({
      id: s.id,
      deviceName: s.deviceName ?? null,
      platform: s.platform ?? null,
      ipAddress: s.ipAddress ?? null,
      lastUsedAt: s.lastUsedAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      isCurrent: s.id === currentSessionId,
    }));
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const user = await this.usersService.findByEmail(email.toLowerCase());

    if (user) {
      await this.passwordResetsRepository.deleteAllForUser(user.id);

      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

      await this.passwordResetsRepository.create({ userId: user.id, tokenHash, expiresAt });

      const appUrl = this.configService.get<string>('APP_URL') ?? 'http://localhost:4200';
      const resetLink = `${appUrl}/reset-password?token=${rawToken}`;

      void this.tasksQueueService
        .sendPasswordResetEmail(email, resetLink, user.firstName)
        .catch((err: unknown) => {
          this.logger.warn('Failed to enqueue password reset email', err);
        });
    }

    return { message: 'If an account exists for this email, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const reset = await this.passwordResetsRepository.findValidByTokenHash(tokenHash);

    if (!reset) throw new BadRequestException('Invalid or expired reset token');

    const newPasswordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await Promise.all([
      this.usersService.updatePassword(reset.userId, newPasswordHash),
      this.passwordResetsRepository.markUsed(reset.id),
      this.sessionsRepository.deactivateAllForUser(reset.userId),
    ]);
  }

  private async resolveUniqueSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    let slug = base;
    let attempt = 0;
    while (await this.organizationsRepository.isSlugTaken(slug)) {
      attempt++;
      slug = `${base}-${attempt}`;
    }
    return slug;
  }

  private hashOtpCode(code: string): string {
    return createHmac('sha256', this.otpSecret).update(code).digest('hex');
  }

  private async issueTokens(
    userId: string,
    email: string,
    organizationId: string,
    role: UserRole,
    sessionId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessPayload: AccessTokenPayload = { sub: userId, email, organizationId, role, sessionId };
    const refreshPayload: RefreshTokenPayload = { sub: userId, sessionId, organizationId, type: 'refresh' };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        expiresIn: this.accessExpirySeconds,
        secret: this.configService.getOrThrow('JWT_ACCESS_SECRET'),
      }),
      this.jwtService.signAsync(refreshPayload, {
        expiresIn: this.refreshExpirySeconds,
        secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    scope: AuthScope,
  ): void {
    this.setAccessCookie(res, accessToken, scope);
    res.cookie(refreshTokenCookieName(scope), refreshToken, {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'lax',
      maxAge: this.refreshExpiryMs,
      path: scope === 'admin' ? '/api/admin/auth' : '/api/auth',
    });
  }

  private setAccessCookie(res: Response, accessToken: string, scope: AuthScope): void {
    res.cookie(accessTokenCookieName(scope), accessToken, {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'lax',
      maxAge: parseDurationToMs(this.accessExpiry),
      path: '/',
    });
  }

  private clearAuthCookies(res: Response, scope: AuthScope): void {
    res.clearCookie(accessTokenCookieName(scope), { path: '/' });
    res.clearCookie(refreshTokenCookieName(scope), {
      path: scope === 'admin' ? '/api/admin/auth/refresh' : '/api/auth/refresh',
    });
  }
}

function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.length > 2 ? local.slice(0, 2) : local[0] ?? '';
  return `${visible}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 15 * 60 * 1000;
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * (multipliers[unit] ?? 60_000);
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() ?? null;
  return req.socket.remoteAddress ?? null;
}

function detectPlatform(req: Request): string {
  const ua = req.headers['user-agent']?.toLowerCase() ?? '';
  const clientHint = req.headers['x-client-type'];
  if (clientHint === 'mobile') return 'mobile';
  if (clientHint === 'api') return 'api';
  if (ua.includes('okhttp') || ua.includes('dart') || ua.includes('react-native')) return 'mobile';
  return 'web';
}

function detectDevice(userAgent?: string): string | null {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  if (ua.includes('iphone')) return 'iPhone';
  if (ua.includes('ipad')) return 'iPad';
  if (ua.includes('android') && ua.includes('mobile')) return 'Android Phone';
  if (ua.includes('android')) return 'Android Tablet';
  if (ua.includes('mac')) return 'Mac';
  if (ua.includes('windows')) return 'Windows PC';
  if (ua.includes('linux')) return 'Linux';
  return 'Unknown Device';
}
