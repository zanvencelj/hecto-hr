# @hecto/auth

JWT-based authentication library for the Hectohr backend. Provides login/logout/refresh flows, stateful session tracking, a global JWT guard, and `@CurrentUser()` / `@Public()` decorators.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | Public | Issue access + refresh tokens, create session |
| `POST` | `/api/auth/refresh` | Public | Rotate access token using refresh token |
| `POST` | `/api/auth/logout` | Required | Revoke current session, clear cookies |
| `POST` | `/api/auth/logout-all` | Required | Revoke all sessions for the user |
| `GET` | `/api/auth/sessions` | Required | List all active sessions |
| `DELETE` | `/api/auth/sessions/:id` | Required | Revoke a specific session |

## Usage

Import `AuthModule` in the root app module — it registers the global `JwtAuthGuard` and exports `AuthService`:

```typescript
import { AuthModule } from '@hecto/auth';

@Module({ imports: [AuthModule] })
export class AppModule {}
```

### Protecting routes

All routes are protected by default. Use `@Public()` to opt out:

```typescript
import { Public, CurrentUser } from '@hecto/auth';

@Public()
@Get('public-route')
openEndpoint() { ... }

@Get('profile')
getProfile(@CurrentUser() user: AccessTokenPayload) {
  return user;
}
```

## Token storage

Both tokens are returned in the response body **and** set as `HttpOnly` cookies. The guard accepts tokens from either source (cookie takes precedence over `Authorization: Bearer`).

| Cookie | Path | Purpose |
|--------|------|---------|
| `access_token` | `/` | Authorise all API requests |
| `refresh_token` | `/api/auth/refresh` | Scoped to refresh endpoint only |

## Required environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_ACCESS_SECRET` | — | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | — | Secret for signing refresh tokens |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token lifetime (`15m`, `1h`, …) |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token + session lifetime |
