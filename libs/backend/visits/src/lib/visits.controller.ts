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
import type {
  AccessTokenPayload,
  KioskDevicePublic,
  KioskPairingCodeResponse,
  VisitPublic,
  VisitSignatureUrlResponse,
} from '@hecto/shared-types';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@hecto/auth';
import { VisitsService } from './visits.service';
import { CreatePairingCodeDto } from './dto/create-pairing-code.dto';
import { RenameDeviceDto } from './dto/rename-device.dto';

@Controller('visits')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'hr', 'manager')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Get('open')
  getOpenVisits(@CurrentUser() user: AccessTokenPayload): Promise<VisitPublic[]> {
    return this.visitsService.getOpenVisits(user.organizationId);
  }

  @Get()
  getVisits(
    @CurrentUser() user: AccessTokenPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<VisitPublic[]> {
    return this.visitsService.getVisits(user.organizationId, from, to);
  }

  @Get(':id/signature-url')
  getSignatureUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<VisitSignatureUrlResponse> {
    return this.visitsService.getSignatureUrl(id, user.organizationId);
  }

  @Post(':id/sign-out')
  @HttpCode(HttpStatus.OK)
  signOutManually(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<VisitPublic> {
    return this.visitsService.signOutVisitorManually(id, user.organizationId);
  }
}

@Controller('kiosk-devices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class KioskDevicesController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post('pairing-codes')
  createPairingCode(
    @Body() dto: CreatePairingCodeDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<KioskPairingCodeResponse> {
    return this.visitsService.createPairingCode(user.organizationId, user.sub, dto.deviceName);
  }

  @Get()
  listDevices(@CurrentUser() user: AccessTokenPayload): Promise<KioskDevicePublic[]> {
    return this.visitsService.listDevices(user.organizationId);
  }

  @Patch(':id')
  renameDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenameDeviceDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<KioskDevicePublic> {
    return this.visitsService.renameDevice(id, user.organizationId, dto.name);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  revokeDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<KioskDevicePublic> {
    return this.visitsService.revokeDevice(id, user.organizationId);
  }
}
