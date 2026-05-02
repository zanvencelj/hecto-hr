import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class VerifyEmailCodeDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Verification code must be exactly 6 digits' })
  code!: string;
}
