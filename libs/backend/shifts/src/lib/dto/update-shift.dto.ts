import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateShiftDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  startTime?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  endTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
