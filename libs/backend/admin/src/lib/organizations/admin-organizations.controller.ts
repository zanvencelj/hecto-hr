import {
  BadRequestException,
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
  AdminOrganization,
  AdminOrgEntityType,
  Paginated,
} from '@hecto/shared-types';
import { ADMIN_ORG_ENTITY_TYPES } from '@hecto/shared-types';
import { AdminOrganizationsService } from './admin-organizations.service';
import { PaginationQueryDto } from '../dto/pagination.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';

@Controller('admin/organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class AdminOrganizationsController {
  constructor(private readonly orgsService: AdminOrganizationsService) {}

  @Get()
  list(@Query() query: PaginationQueryDto): Promise<Paginated<AdminOrganization>> {
    return this.orgsService.list(query.limit ?? 50, query.offset ?? 0, query.search);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<AdminOrganization> {
    return this.orgsService.getById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<AdminOrganization> {
    return this.orgsService.update(id, dto, user.sub);
  }

  @Post(':id/disable')
  @HttpCode(HttpStatus.OK)
  disable(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<AdminOrganization> {
    return this.orgsService.disable(id, user.sub);
  }

  @Post(':id/enable')
  @HttpCode(HttpStatus.OK)
  enable(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<AdminOrganization> {
    return this.orgsService.enable(id, user.sub);
  }

  @Post(':id/soft-delete')
  @HttpCode(HttpStatus.OK)
  softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<AdminOrganization> {
    return this.orgsService.softDelete(id, user.sub);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<AdminOrganization> {
    return this.orgsService.restore(id, user.sub);
  }

  @Get(':id/entities/:entityType')
  listEntities(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entityType') entityType: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<Record<string, unknown>>> {
    if (!isOrgEntityType(entityType)) {
      throw new BadRequestException('Unknown entity type');
    }
    return this.orgsService.listEntities(id, entityType, query.limit ?? 50, query.offset ?? 0);
  }
}

function isOrgEntityType(value: string): value is AdminOrgEntityType {
  return (ADMIN_ORG_ENTITY_TYPES as readonly string[]).includes(value);
}
