import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  const rawOrigins = process.env['CORS_ORIGINS'] ?? 'http://localhost:4200';
  const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Type'],
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
  Logger.log(`Application is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap().catch(console.error);
