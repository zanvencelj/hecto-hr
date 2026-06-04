import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import type { WorkEventType } from '@hecto/database';

export class CreateEventDto {
  @IsEnum([
    'arrival',
    'departure',
    'break_start',
    'break_end',
    'remote_arrival',
    'business_trip_start',
    'business_trip_end',
  ])
  type!: WorkEventType;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
