import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AccessTokenPayload, WorkEventPublic, EventChangeRequestPublic } from '@hecto/shared-types';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@hecto/auth';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';
import { ReviewChangeRequestDto } from './dto/review-change-request.dto';

@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateEventDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<WorkEventPublic> {
    return this.eventsService.create(user.sub, user.organizationId, dto);
  }

  @Get('me')
  getMyEvents(
    @CurrentUser() user: AccessTokenPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<WorkEventPublic[]> {
    return this.eventsService.getForEmployee(user.sub, user.organizationId, from, to);
  }

  @Get('employee/:userId')
  @Roles('admin', 'hr', 'manager')
  getEmployeeEvents(
    @Param('userId') userId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<WorkEventPublic[]> {
    return this.eventsService.getForEmployee(userId, user.organizationId, from, to);
  }

  @Get('org')
  @Roles('admin', 'hr', 'manager')
  getOrgEvents(
    @CurrentUser() user: AccessTokenPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<WorkEventPublic[]> {
    return this.eventsService.getForOrganization(user.organizationId, from, to);
  }

  @Post('change-requests')
  @HttpCode(HttpStatus.CREATED)
  createChangeRequest(
    @Body() dto: CreateChangeRequestDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<EventChangeRequestPublic> {
    return this.eventsService.createChangeRequest(user.sub, user.organizationId, dto);
  }

  @Get('change-requests/me')
  getMyChangeRequests(
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<EventChangeRequestPublic[]> {
    return this.eventsService.getChangeRequestsForEmployee(user.sub, user.organizationId);
  }

  @Get('change-requests/org')
  @Roles('admin', 'hr', 'manager')
  getOrgChangeRequests(
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<EventChangeRequestPublic[]> {
    return this.eventsService.getChangeRequestsForOrg(user.organizationId);
  }

  @Patch('change-requests/:id/review')
  @Roles('admin', 'hr', 'manager')
  reviewChangeRequest(
    @Param('id') id: string,
    @Body() dto: ReviewChangeRequestDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<EventChangeRequestPublic> {
    return this.eventsService.reviewChangeRequest(id, user.organizationId, user.sub, dto);
  }
}
