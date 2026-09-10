import { Controller, Get, Inject, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheck, HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus';
import Redis from 'ioredis';
import { sql } from 'drizzle-orm';
import { DATABASE_CONNECTION, type Database } from '@hecto/database';
import { Public } from '@hecto/auth';

@Controller('health')
export class HealthController implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(
    private readonly health: HealthCheckService,
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    configService: ConfigService,
  ) {
    this.redis = new Redis({
      host: configService.get<string>('REDIS_HOST') ?? 'localhost',
      port: configService.get<number>('REDIS_PORT') ?? 6379,
      password: configService.get<string>('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.checkDatabase(),
      () => this.checkRedis(),
    ]);
  }

  private async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      await this.db.execute(sql`SELECT 1`);
      return { database: { status: 'up' } };
    } catch {
      return { database: { status: 'down' } };
    }
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    try {
      await this.redis.ping();
      return { redis: { status: 'up' } };
    } catch {
      return { redis: { status: 'down' } };
    }
  }
}
