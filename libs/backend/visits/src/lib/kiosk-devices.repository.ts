import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type Database,
  kioskDevices,
  type KioskDevice,
  type NewKioskDevice,
  kioskPairingCodes,
  type KioskPairingCode,
  type NewKioskPairingCode,
  organizations,
  withUpdatedAt,
} from '@hecto/database';

@Injectable()
export class KioskDevicesRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async createPairingCode(data: NewKioskPairingCode): Promise<KioskPairingCode> {
    const result = await this.db.insert(kioskPairingCodes).values(data).returning();
    return result[0]!;
  }

  async findValidPairingCode(codeHash: string): Promise<KioskPairingCode | undefined> {
    const result = await this.db
      .select()
      .from(kioskPairingCodes)
      .where(
        and(
          eq(kioskPairingCodes.codeHash, codeHash),
          isNull(kioskPairingCodes.usedAt),
          gt(kioskPairingCodes.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return result[0];
  }

  async markPairingCodeUsed(id: string): Promise<void> {
    await this.db
      .update(kioskPairingCodes)
      .set({ usedAt: new Date() })
      .where(eq(kioskPairingCodes.id, id));
  }

  async createDevice(data: NewKioskDevice): Promise<KioskDevice> {
    const result = await this.db.insert(kioskDevices).values(data).returning();
    return result[0]!;
  }

  async findActiveByTokenHash(tokenHash: string): Promise<KioskDevice | undefined> {
    const result = await this.db
      .select()
      .from(kioskDevices)
      .where(and(eq(kioskDevices.tokenHash, tokenHash), isNull(kioskDevices.revokedAt)))
      .limit(1);
    return result[0];
  }

  async touchLastSeen(id: string): Promise<void> {
    await this.db
      .update(kioskDevices)
      .set(withUpdatedAt({ lastSeenAt: new Date() }))
      .where(eq(kioskDevices.id, id));
  }

  async listByOrg(organizationId: string): Promise<KioskDevice[]> {
    return this.db
      .select()
      .from(kioskDevices)
      .where(eq(kioskDevices.organizationId, organizationId))
      .orderBy(desc(kioskDevices.createdAt));
  }

  async findByIdInOrg(id: string, organizationId: string): Promise<KioskDevice | undefined> {
    const result = await this.db
      .select()
      .from(kioskDevices)
      .where(and(eq(kioskDevices.id, id), eq(kioskDevices.organizationId, organizationId)))
      .limit(1);
    return result[0];
  }

  async rename(id: string, name: string): Promise<KioskDevice | undefined> {
    const result = await this.db
      .update(kioskDevices)
      .set(withUpdatedAt({ name }))
      .where(eq(kioskDevices.id, id))
      .returning();
    return result[0];
  }

  async revoke(id: string): Promise<KioskDevice | undefined> {
    const result = await this.db
      .update(kioskDevices)
      .set(withUpdatedAt({ revokedAt: new Date() }))
      .where(and(eq(kioskDevices.id, id), isNull(kioskDevices.revokedAt)))
      .returning();
    return result[0];
  }

  async getOrganizationName(organizationId: string): Promise<string | undefined> {
    const result = await this.db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    return result[0]?.name;
  }
}
