import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@hecto/database';
import { UsersModule } from '@hecto/users';
import { AuthModule } from '@hecto/auth';
import { QueueModule } from '@hecto/queue';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    UsersModule,
    QueueModule,
    AuthModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
