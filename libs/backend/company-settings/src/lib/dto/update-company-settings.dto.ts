import { ArrayUnique, IsArray, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateCompanySettingsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekendDays!: number[];

  @IsInt()
  @Min(0)
  @Max(240)
  unpaidBreakThresholdMinutes!: number;
}
