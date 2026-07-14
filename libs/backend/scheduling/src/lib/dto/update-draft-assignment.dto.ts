import { IsOptional, IsUUID } from 'class-validator';

export class UpdateDraftAssignmentDto {
  /** New assignee; null/omitted unassigns the shift within the draft. */
  @IsOptional()
  @IsUUID()
  userId?: string | null;
}
