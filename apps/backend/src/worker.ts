import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker/worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();

  const logger = new Logger('Worker');
  logger.log('Worker process started — polling "tasks" queue');
}

bootstrap().catch((err: unknown) => {
  console.error('Worker failed to bootstrap:', err);
  process.exit(1);
});
