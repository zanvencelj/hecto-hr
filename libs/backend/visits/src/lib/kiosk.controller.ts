import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { KioskOpenVisit, KioskPairResponse } from '@hecto/shared-types';
import type { KioskDevice } from '@hecto/database';
import { Public } from '@hecto/auth';
import { VisitsService } from './visits.service';
import { KioskAuthGuard } from './guards/kiosk-auth.guard';
import { CurrentDevice } from './decorators/current-device.decorator';
import { PairKioskDto } from './dto/pair-kiosk.dto';
import { CreateVisitDto } from './dto/create-visit.dto';

/**
 * Endpoints used by paired kiosk tablets. All routes are @Public to bypass
 * the global JWT guard; every route except /pair requires a device token
 * via KioskAuthGuard instead.
 */
@Controller('kiosk')
@Public()
export class KioskController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post('pair')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60_000, limit: 5 } })
  pair(@Body() dto: PairKioskDto): Promise<KioskPairResponse> {
    return this.visitsService.pairDevice(dto.code);
  }

  @Get('visits/open')
  @UseGuards(KioskAuthGuard)
  getOpenVisits(@CurrentDevice() device: KioskDevice): Promise<KioskOpenVisit[]> {
    return this.visitsService.getOpenVisitsForKiosk(device.organizationId);
  }

  @Post('visits')
  @UseGuards(KioskAuthGuard)
  signIn(
    @CurrentDevice() device: KioskDevice,
    @Body() dto: CreateVisitDto,
  ): Promise<KioskOpenVisit> {
    return this.visitsService.signInVisitor(device, dto);
  }

  @Post('visits/:id/sign-out')
  @HttpCode(HttpStatus.OK)
  @UseGuards(KioskAuthGuard)
  signOut(
    @CurrentDevice() device: KioskDevice,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<KioskOpenVisit> {
    return this.visitsService.signOutVisitor(device, id);
  }
}
