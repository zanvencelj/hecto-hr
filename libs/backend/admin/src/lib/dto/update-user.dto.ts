import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { UserRole } from '@hecto/shared-types';

/** Roles assignable through the admin API. Superadmin is script-only by design. */
const ASSIGNABLE_ROLES = ['admin', 'hr', 'manager', 'employee'] as const;

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  username?: string;

  @IsOptional()
  @IsIn(ASSIGNABLE_ROLES)
  role?: Extract<UserRole, (typeof ASSIGNABLE_ROLES)[number]>;
}
