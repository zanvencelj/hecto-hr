import { IsString, Length } from 'class-validator';

export class CreatePairingCodeDto {
  @IsString()
  @Length(2, 150)
  deviceName!: string;
}
