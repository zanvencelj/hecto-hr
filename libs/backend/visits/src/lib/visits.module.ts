import { Module } from '@nestjs/common';
import { AuthModule } from '@hecto/auth';
import { VisitsController, KioskDevicesController } from './visits.controller';
import { KioskController } from './kiosk.controller';
import { VisitsService } from './visits.service';
import { VisitsRepository } from './visits.repository';
import { KioskDevicesRepository } from './kiosk-devices.repository';
import { KioskAuthGuard } from './guards/kiosk-auth.guard';

@Module({
  imports: [AuthModule],
  controllers: [VisitsController, KioskDevicesController, KioskController],
  providers: [VisitsService, VisitsRepository, KioskDevicesRepository, KioskAuthGuard],
  exports: [VisitsService, VisitsRepository],
})
export class VisitsModule {}
