import { IsString, MinLength, MaxLength } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
