import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { AvailabilityPreference } from '@hecto/shared-types';

export class SetAvailabilityDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsEnum(['preferred', 'available', 'unavailable'])
  preference!: AvailabilityPreference;

  @IsOptional()
  @IsString()
  timeFrom?: string;

  @IsOptional()
  @IsString()
  timeTo?: string;
}
