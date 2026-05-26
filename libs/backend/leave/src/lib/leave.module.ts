import { Module } from '@nestjs/common';
import { AuthModule } from '@hecto/auth';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { LeaveRepository } from './leave.repository';

@Module({
  imports: [AuthModule],
  controllers: [LeaveController],
  providers: [LeaveService, LeaveRepository],
  exports: [LeaveService],
})
export class LeaveModule {}
