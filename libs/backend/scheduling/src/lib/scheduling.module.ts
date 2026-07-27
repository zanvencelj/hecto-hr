import { Module } from '@nestjs/common';
import { AuthModule } from '@hecto/auth';
import { SchedulingController } from './scheduling.controller';
import { SchedulingService } from './scheduling.service';
import { SchedulingRepository } from './scheduling.repository';

@Module({
  imports: [AuthModule],
  controllers: [SchedulingController],
  providers: [SchedulingService, SchedulingRepository],
  exports: [SchedulingService],
})
export class SchedulingModule {}
