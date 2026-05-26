import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class CreateShiftBreakDto {
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  startTime?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  endTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480)
  durationMinutes?: number;

  @IsBoolean()
  isFixed!: boolean;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
