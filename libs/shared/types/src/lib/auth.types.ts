import type { UserPublic } from './user.types';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  isSuperuser: boolean;
  isStaff: boolean;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

export interface LoginResponse {
  user: UserPublic;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface RegistrationInitiatedResponse {
  message: string;
  email: string;
  expiresAt: string;
}

export interface ResendCodeResponse {
  message: string;
  resentCount: number;
  nextResendAvailableAt: string | null;
}
