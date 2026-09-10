import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import { LoggerModule } from 'nestjs-pino';
import { DatabaseModule } from '@hecto/database';
import { UsersModule } from '@hecto/users';
import { AuthModule, JwtAuthGuard } from '@hecto/auth';
import { QueueModule } from '@hecto/queue';
import { StorageModule } from '@hecto/storage';
import { EmployeesModule } from '@hecto/employees';
import { ShiftsModule } from '@hecto/shifts';
import { LeaveModule } from '@hecto/leave';
import { SchedulingModule } from '@hecto/scheduling';
import { EventsModule } from '@hecto/events';
import { ReportsModule } from '@hecto/reports';
import { VisitsModule } from '@hecto/visits';
import { AdminModule } from '@hecto/admin';
import { CompanySettingsModule } from '@hecto/company-settings';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { loggerConfig } from '../logger.config';
import { validateEnv } from '../env.validation';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    LoggerModule.forRoot(loggerConfig),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 60_000, limit: 100 },
    ]),
    TerminusModule,
    DatabaseModule,
    StorageModule,
    UsersModule,
    QueueModule,
    AuthModule,
    EmployeesModule,
    ShiftsModule,
    LeaveModule,
    SchedulingModule,
    EventsModule,
    ReportsModule,
    VisitsModule,
    AdminModule,
    CompanySettingsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
