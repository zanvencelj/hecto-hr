import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { QueueModule, TasksProcessor } from '@hecto/queue';
import { DatabaseModule } from '@hecto/database';
import { loggerConfig } from '../logger.config';
import { ScheduledTasksService } from './scheduled-tasks.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    LoggerModule.forRoot(loggerConfig),
    ScheduleModule.forRoot(),
    DatabaseModule,
    QueueModule,
  ],
  providers: [TasksProcessor, ScheduledTasksService],
})
export class WorkerModule {}
