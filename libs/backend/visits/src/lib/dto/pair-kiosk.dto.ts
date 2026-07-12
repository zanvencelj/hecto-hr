import { IsString, Matches } from 'class-validator';

export class PairKioskDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Pairing code must be 6 digits' })
  code!: string;
}
