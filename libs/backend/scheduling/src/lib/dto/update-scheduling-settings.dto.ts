import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { AssignmentStrategy, SchedulingDefaultAvailability } from '@hecto/shared-types';

export class UpdateSchedulingSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  maxHoursPerWeek?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24)
  minRestHours?: number;

  @IsOptional()
  @IsBoolean()
  enforceMaxHours?: boolean;

  @IsOptional()
  @IsBoolean()
  enforceRestRule?: boolean;

  @IsOptional()
  @IsEnum(['available', 'unavailable'])
  defaultAvailability?: SchedulingDefaultAvailability;

  @IsOptional()
  @IsEnum(['preference_first', 'fairness_first', 'preference_only'])
  assignmentStrategy?: AssignmentStrategy;

  @IsOptional()
  @IsBoolean()
  allowClaimingDuringDraft?: boolean;
}
