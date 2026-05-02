# @hecto/users

User management library for the Hectohr backend. Handles user creation, lookup, credential validation, and password hashing. Used internally by `@hecto/auth` and exposed to other modules via `UsersService`.

## Usage

Import `UsersModule` wherever user operations are needed:

```typescript
import { UsersModule } from '@hecto/users';

@Module({ imports: [UsersModule] })
export class SomeModule {}
```

## UsersService API

| Method | Description |
|--------|-------------|
| `create(dto)` | Hash password with argon2id, persist user, return `UserPublic` |
| `findById(id)` | Fetch user by UUID, throw `NotFoundException` if missing |
| `validateCredentials(email, password)` | Verify email + argon2id hash, return full `User` or `null` |
| `updateLastLogin(id)` | Set `last_login` timestamp (called after successful login) |
| `toPublic(user)` | Strip `passwordHash` and return a `UserPublic` object |

## Password hashing

`argon2id` with OWASP-recommended parameters:

```
memoryCost: 65536 (64 MB)
timeCost:   3
parallelism: 4
```

## CreateUserDto

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | `string` | Yes | Lowercased before storage |
| `password` | `string` | Yes | Min 8 characters |
| `username` | `string` | No | Unique |
| `firstName` | `string` | No | |
| `lastName` | `string` | No | |
