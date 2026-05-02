import { Inject, Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { DATABASE_CONNECTION, type Database, users } from '@hecto/database';

const SEED_PASSWORD = 'hecto123';

const SEED_USERS = [
  {
    email: 'admin@hecto.dev',
    username: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    isActive: true,
    isSuperuser: true,
    isStaff: true,
  },
  {
    email: 'staff@hecto.dev',
    username: 'staff',
    firstName: 'Staff',
    lastName: 'User',
    isActive: true,
    isSuperuser: false,
    isStaff: true,
  },
  {
    email: 'alice@hecto.dev',
    username: 'alice',
    firstName: 'Alice',
    lastName: 'Smith',
    isActive: true,
    isSuperuser: false,
    isStaff: false,
  },
  {
    email: 'bob@hecto.dev',
    username: 'bob',
    firstName: 'Bob',
    lastName: 'Jones',
    isActive: true,
    isSuperuser: false,
    isStaff: false,
  },
];

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async run(): Promise<void> {
    this.logger.log('Starting database seed...');
    await this.seedUsers();
    this.logger.log('Seed completed.');
  }

  private async seedUsers(): Promise<void> {
    const passwordHash = await argon2.hash(SEED_PASSWORD, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    for (const user of SEED_USERS) {
      const inserted = await this.db
        .insert(users)
        .values({ ...user, passwordHash })
        .onConflictDoNothing({ target: users.email })
        .returning({ email: users.email });

      if (inserted.length > 0) {
        this.logger.log(`Created user: ${user.email}`);
      } else {
        this.logger.log(`Skipped (already exists): ${user.email}`);
      }
    }
  }
}
