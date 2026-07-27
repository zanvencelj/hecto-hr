import { IsDateString } from 'class-validator';

export class GenerateDraftDto {
  @IsDateString()
  dateFrom!: string;

  @IsDateString()
  dateTo!: string;
}
