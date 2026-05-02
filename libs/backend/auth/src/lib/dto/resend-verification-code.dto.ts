import { IsEmail } from 'class-validator';

export class ResendVerificationCodeDto {
  @IsEmail()
  email!: string;
}
