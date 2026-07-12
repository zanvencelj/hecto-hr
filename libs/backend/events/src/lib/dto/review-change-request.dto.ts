import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ReviewChangeRequestDto {
  @IsEnum(['approved', 'rejected'])
  status!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
