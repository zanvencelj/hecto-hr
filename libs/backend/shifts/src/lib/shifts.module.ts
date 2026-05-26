import { Module } from '@nestjs/common';
import { AuthModule } from '@hecto/auth';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
import { ShiftsRepository } from './shifts.repository';

@Module({
  imports: [AuthModule],
  controllers: [ShiftsController],
  providers: [ShiftsService, ShiftsRepository],
  exports: [ShiftsService],
})
export class ShiftsModule {}
