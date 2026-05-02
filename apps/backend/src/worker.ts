import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { WorkerModule } from './worker/worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  app.get(Logger).log('Worker process started — polling "tasks" queue', 'Worker');
}

bootstrap().catch((err: unknown) => {
  console.error('Worker failed to bootstrap:', err);
  process.exit(1);
});
