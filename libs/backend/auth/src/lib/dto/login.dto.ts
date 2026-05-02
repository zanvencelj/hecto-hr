import { IsEmail, IsString, IsOptional, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceName?: string;
}
