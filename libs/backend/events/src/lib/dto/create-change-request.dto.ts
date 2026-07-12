import { IsEnum, IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';
import type { ChangeRequestType, WorkEventType } from '@hecto/shared-types';

export class CreateChangeRequestDto {
  @IsEnum(['add', 'edit', 'delete'])
  requestType!: ChangeRequestType;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsEnum(['arrival', 'departure', 'break_start', 'break_end', 'remote_arrival', 'business_trip_start', 'business_trip_end'])
  requestedType?: WorkEventType;

  @IsOptional()
  @IsDateString()
  requestedOccurredAt?: string;

  @IsOptional()
  @IsString()
  requestedNotes?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
