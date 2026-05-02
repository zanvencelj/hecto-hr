import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueueModule, TasksProcessor } from '@hecto/queue';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    QueueModule,
  ],
  providers: [TasksProcessor],
})
export class WorkerModule {}
