import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import type { UserRole } from '@hecto/shared-types';

export class UpdateEmployeeDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(150)
  position?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
