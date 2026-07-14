import { IsEmail, IsString, IsOptional, MaxLength } from 'class-validator';

export class AdminLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceName?: string;
}
