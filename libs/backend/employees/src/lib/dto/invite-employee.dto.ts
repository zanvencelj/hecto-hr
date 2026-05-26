import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import type { UserRole } from '@hecto/shared-types';

export class InviteEmployeeDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  lastName?: string;

  @IsOptional()
  @IsEnum(['hr', 'manager', 'employee'])
  role?: Extract<UserRole, 'hr' | 'manager' | 'employee'>;
}
