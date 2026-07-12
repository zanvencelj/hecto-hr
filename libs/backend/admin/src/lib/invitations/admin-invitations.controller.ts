import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@hecto/auth';
import type { AccessTokenPayload, AdminInvitation } from '@hecto/shared-types';
import { AdminInvitationsService } from './admin-invitations.service';

@Controller('admin/invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class AdminInvitationsController {
  constructor(private readonly invitationsService: AdminInvitationsService) {}

  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  resend(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<AdminInvitation> {
    return this.invitationsService.resend(id, user.sub);
  }
}
