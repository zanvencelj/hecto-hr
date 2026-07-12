import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Inject, Injectable, Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, DatabaseModule, type Database, users } from '@hecto/database';

/**
 * Creates (or reports) a platform superadmin account. This script is the ONLY
 * way to create superadmins — there is intentionally no API or UI path.
 *
 * Usage:
 *   SUPERADMIN_EMAIL=ops@hecto.io SUPERADMIN_PASSWORD=... pnpm superadmin:create
 * or:
 *   pnpm superadmin:create -- <email> <password> [firstName] [lastName]
 */
@Injectable()
class CreateSuperadminService {
  private readonly logger = new Logger('CreateSuperadmin');

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async run(email: string, password: string, firstName?: string, lastName?: string): Promise<void> {
    const existing = await this.db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing[0]) {
      if (existing[0].role === 'superadmin') {
        this.logger.log(`Superadmin ${email} already exists — nothing to do`);
        return;
      }
      throw new Error(`A non-superadmin user with email ${email} already exists`);
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await this.db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      role: 'superadmin',
      organizationId: null,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      isActive: true,
    });

    this.logger.log(`Superadmin ${email} created`);
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
  ],
  providers: [CreateSuperadminService],
})
class CreateSuperadminModule {}

async function bootstrap() {
  const [, , argEmail, argPassword, argFirstName, argLastName] = process.argv;
  const email = argEmail ?? process.env['SUPERADMIN_EMAIL'];
  const password = argPassword ?? process.env['SUPERADMIN_PASSWORD'];

  if (!email || !password) {
    console.error(
      'Usage: pnpm superadmin:create -- <email> <password> [firstName] [lastName]\n' +
        '   or: SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... pnpm superadmin:create',
    );
    process.exitCode = 1;
    return;
  }

  if (password.length < 12) {
    console.error('Superadmin password must be at least 12 characters');
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(CreateSuperadminModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const service = app.get(CreateSuperadminService);
    await service.run(email, password, argFirstName, argLastName);
  } catch (err) {
    console.error('create-superadmin failed:', err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
