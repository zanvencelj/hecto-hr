import { IsEmail, IsOptional, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Matches(/^[\w.@+-]+$/, { message: 'username may only contain letters, numbers, and @/./+/-/_ characters' })
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  lastName?: string;
}
