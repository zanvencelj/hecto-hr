import { IsBoolean, IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  leaveTypeId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isManualEntry?: boolean;
}
