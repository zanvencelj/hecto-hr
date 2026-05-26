import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ReviewLeaveRequestDto {
  @IsEnum(['approved', 'rejected'])
  status!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
