import { IsNumber, IsPositive } from 'class-validator';

export class EditRequestDaysDto {
  @IsNumber()
  @IsPositive()
  totalDays!: number;
}
