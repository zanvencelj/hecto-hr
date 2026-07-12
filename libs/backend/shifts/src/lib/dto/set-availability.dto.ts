import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SetAvailabilityDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsBoolean()
  isAvailable!: boolean;

  @IsOptional()
  @IsString()
  timeFrom?: string;

  @IsOptional()
  @IsString()
  timeTo?: string;
}
