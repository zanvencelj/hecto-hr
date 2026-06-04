import { Module } from '@nestjs/common';
import { AuthModule } from '@hecto/auth';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsRepository } from './events.repository';
import { ChangeRequestsRepository } from './change-requests.repository';

@Module({
  imports: [AuthModule],
  controllers: [EventsController],
  providers: [EventsService, EventsRepository, ChangeRequestsRepository],
  exports: [EventsService],
})
export class EventsModule {}
