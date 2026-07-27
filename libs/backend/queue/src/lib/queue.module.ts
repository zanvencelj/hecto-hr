import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { MailModule } from '@hecto/mail';
import { TASKS_QUEUE } from './queue.constants';
import { TasksQueueService } from './tasks-queue.service';
import { PushService } from './push.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') ?? 'localhost',
          port: Number(config.get<string>('REDIS_PORT') ?? '6379'),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          tls: config.get<string>('REDIS_TLS') === 'true' ? {} : undefined,
          // Required for BullMQ workers — prevents IORedis from timing out long-polling connections
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1_000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 500 },
        },
      }),
    }),
    BullModule.registerQueue({ name: TASKS_QUEUE }),
    MailModule,
  ],
  providers: [TasksQueueService, PushService],
  exports: [TasksQueueService, PushService, MailModule],
})
export class QueueModule {}
