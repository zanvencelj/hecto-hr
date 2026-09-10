import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@hecto/auth';
import type { AccessTokenPayload } from '@hecto/shared-types';
import type { AppLinks } from '@hecto/database';
import { AdminAppLinksService } from './admin-app-links.service';
import { UpdateAppLinksDto } from '../dto/update-app-links.dto';

@Controller('admin/app-links')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class AdminAppLinksController {
  constructor(private readonly appLinksService: AdminAppLinksService) {}

  @Get()
  get() {
    return this.appLinksService.get();
  }

  @Patch()
  update(
    @Body() dto: UpdateAppLinksDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<AppLinks> {
    return this.appLinksService.update(dto, user.sub);
  }
}
