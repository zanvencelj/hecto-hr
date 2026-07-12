import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@hecto/auth';
import type {
  AccessTokenPayload,
  AdminSessionInfo,
  AdminUser,
  ForgotPasswordResponse,
  Paginated,
} from '@hecto/shared-types';
import { AdminUsersService } from './admin-users.service';
import { PaginationQueryDto } from '../dto/pagination.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get()
  list(
    @Query() query: PaginationQueryDto,
    @Query('organizationId') organizationId?: string,
  ): Promise<Paginated<AdminUser>> {
    return this.usersService.list(query.limit ?? 50, query.offset ?? 0, query.search, organizationId);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<AdminUser> {
    return this.usersService.getById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<AdminUser> {
    return this.usersService.update(id, dto, user.sub);
  }

  @Post(':id/disable')
  @HttpCode(HttpStatus.OK)
  disable(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<AdminUser> {
    return this.usersService.disable(id, user.sub);
  }

  @Post(':id/enable')
  @HttpCode(HttpStatus.OK)
  enable(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<AdminUser> {
    return this.usersService.enable(id, user.sub);
  }

  @Post(':id/soft-delete')
  @HttpCode(HttpStatus.OK)
  softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<AdminUser> {
    return this.usersService.softDelete(id, user.sub);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<AdminUser> {
    return this.usersService.restore(id, user.sub);
  }

  @Post(':id/revoke-sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSessions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<void> {
    await this.usersService.revokeSessions(id, user.sub);
  }

  @Post(':id/force-password-reset')
  @HttpCode(HttpStatus.OK)
  forcePasswordReset(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<ForgotPasswordResponse> {
    return this.usersService.forcePasswordReset(id, user.sub);
  }

  @Get(':id/sessions')
  listSessions(@Param('id', ParseUUIDPipe) id: string): Promise<AdminSessionInfo[]> {
    return this.usersService.listSessions(id);
  }
}
