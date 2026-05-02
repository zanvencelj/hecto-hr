import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '@hecto/users';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SessionsRepository } from './sessions.repository';
import { EmailVerificationRepository } from './email-verification.repository';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_ACCESS_SECRET'),
      }),
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionsRepository, EmailVerificationRepository, JwtAuthGuard],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
