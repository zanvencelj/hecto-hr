import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { sql } from 'drizzle-orm';
import { Inject } from '@nestjs/common';
import { DATABASE_CONNECTION, type Database } from '@hecto/database';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpiredEmailVerifications(): Promise<void> {
    const result = await this.db.execute(
      sql`DELETE FROM email_verifications WHERE expires_at < now()`,
    );
    this.logger.debug(`Purged expired email verifications: ${result.rowCount ?? 0} rows`);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpiredPasswordResets(): Promise<void> {
    const result = await this.db.execute(
      sql`DELETE FROM password_resets WHERE expires_at < now()`,
    );
    this.logger.debug(`Purged expired password resets: ${result.rowCount ?? 0} rows`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpiredSessions(): Promise<void> {
    const result = await this.db.execute(
      sql`DELETE FROM sessions WHERE expires_at < now() AND is_active = false`,
    );
    this.logger.debug(`Purged expired sessions: ${result.rowCount ?? 0} rows`);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpiredKioskPairingCodes(): Promise<void> {
    const result = await this.db.execute(
      sql`DELETE FROM kiosk_pairing_codes WHERE expires_at < now()`,
    );
    this.logger.debug(`Purged expired kiosk pairing codes: ${result.rowCount ?? 0} rows`);
  }

  /** Visitors who forgot to sign out get closed overnight; auto_closed_at marks them. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async autoCloseStaleVisits(): Promise<void> {
    const result = await this.db.execute(
      sql`UPDATE visits
          SET signed_out_at = now(), auto_closed_at = now(), updated_at = now()
          WHERE signed_out_at IS NULL AND signed_in_at < date_trunc('day', now())`,
    );
    this.logger.log(`Auto-closed stale visits: ${result.rowCount ?? 0} rows`);
  }
}
