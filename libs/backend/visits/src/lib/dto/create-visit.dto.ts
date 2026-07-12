import { IsString, Length, MaxLength } from 'class-validator';

export class CreateVisitDto {
  @IsString()
  @Length(2, 200)
  name!: string;

  @IsString()
  @Length(2, 500)
  purpose!: string;

  /** Base64-encoded PNG, with or without a data-URL prefix. */
  @IsString()
  @MaxLength(3_000_000)
  signature!: string;
}
