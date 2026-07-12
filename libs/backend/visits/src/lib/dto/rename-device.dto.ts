import { IsString, Length } from 'class-validator';

export class RenameDeviceDto {
  @IsString()
  @Length(2, 150)
  name!: string;
}
