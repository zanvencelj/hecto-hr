import { Module } from '@nestjs/common';
import { AuthModule } from '@hecto/auth';
import { UsersModule } from '@hecto/users';
import { QueueModule } from '@hecto/queue';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmployeesRepository } from './employees.repository';
import { InvitationsRepository } from './invitations.repository';

@Module({
  imports: [AuthModule, UsersModule, QueueModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeesRepository, InvitationsRepository],
  exports: [EmployeesService],
})
export class EmployeesModule {}
