export type AuthScope = 'user' | 'admin';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const ADMIN_ACCESS_TOKEN_COOKIE = 'admin_access_token';
export const ADMIN_REFRESH_TOKEN_COOKIE = 'admin_refresh_token';

export function accessTokenCookieName(scope: AuthScope): string {
  return scope === 'admin' ? ADMIN_ACCESS_TOKEN_COOKIE : ACCESS_TOKEN_COOKIE;
}

export function refreshTokenCookieName(scope: AuthScope): string {
  return scope === 'admin' ? ADMIN_REFRESH_TOKEN_COOKIE : REFRESH_TOKEN_COOKIE;
}
