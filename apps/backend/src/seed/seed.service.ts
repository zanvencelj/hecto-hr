import { Inject, Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, type Database, type LeaveType, users, organizations, leaveTypes } from '@hecto/database';

const SEED_PASSWORD = 'hecto123';
const DEV_ORG_NAME = 'Hecto Dev';
const DEV_ORG_SLUG = 'hecto-dev';

const SEED_USERS = [
  {
    email: 'admin@hecto.dev',
    username: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    isActive: true,
    role: 'admin' as const,
  },
  {
    email: 'hr@hecto.dev',
    username: 'hr',
    firstName: 'HR',
    lastName: 'Manager',
    isActive: true,
    role: 'hr' as const,
  },
  {
    email: 'manager@hecto.dev',
    username: 'manager',
    firstName: 'Team',
    lastName: 'Manager',
    isActive: true,
    role: 'manager' as const,
  },
  {
    email: 'employee@hecto.dev',
    username: 'employee',
    firstName: 'Alice',
    lastName: 'Smith',
    isActive: true,
    role: 'employee' as const,
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
    const orgId = await this.seedOrganization();
    await this.seedUsers(orgId);
    await this.seedLeaveTypes(orgId);
    this.logger.log('Seed completed.');
  }

  private async seedOrganization(): Promise<string> {
    const existing = (await this.db
      .select()
      .from(organizations)
      .limit(1)) as Array<{ id: string }>;

    if (existing[0]) {
      this.logger.log(`Skipped organization (already exists): ${DEV_ORG_SLUG}`);
      return existing[0].id;
    }

    const inserted = (await this.db
      .insert(organizations)
      .values({ name: DEV_ORG_NAME, slug: DEV_ORG_SLUG })
      .returning()) as Array<{ id: string }>;

    this.logger.log(`Created organization: ${DEV_ORG_SLUG}`);
    return inserted[0].id;
  }

  private async seedLeaveTypes(organizationId: string): Promise<void> {
    const defaults = [
      { name: 'Sick Leave', code: 'SICK', color: '#ef4444', defaultDaysPerYear: 10, isPaid: true },
      { name: 'Holiday Leave', code: 'HOLIDAY', color: '#6366f1', defaultDaysPerYear: 20, isPaid: true },
    ];

    const existing = await this.db
      .select()
      .from(leaveTypes)
      .where(eq(leaveTypes.organizationId, organizationId)) as LeaveType[];

    const existingCodes = new Set((existing as Array<{ code: string }>).map((r) => r.code));

    for (const lt of defaults) {
      if (existingCodes.has(lt.code)) {
        this.logger.log(`Skipped leave type (already exists): ${lt.name}`);
        continue;
      }
      await this.db.insert(leaveTypes).values({ ...lt, organizationId });
      this.logger.log(`Created leave type: ${lt.name}`);
    }
  }

  private async seedUsers(organizationId: string): Promise<void> {
    const passwordHash = await argon2.hash(SEED_PASSWORD, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    for (const user of SEED_USERS) {
      const inserted = await this.db
        .insert(users)
        .values({ ...user, passwordHash, organizationId })
        .onConflictDoNothing({ target: users.email })
        .returning({ email: users.email });

      if (inserted.length > 0) {
        this.logger.log(`Created user: ${user.email} (${user.role})`);
      } else {
        this.logger.log(`Skipped (already exists): ${user.email}`);
      }
    }
  }
}
