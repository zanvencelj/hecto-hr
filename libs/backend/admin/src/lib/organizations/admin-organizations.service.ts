import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { count, desc, eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, type Database, type Organization } from '@hecto/database';
import type {
  AdminOrganization,
  AdminOrgEntityType,
  Paginated,
} from '@hecto/shared-types';
import {
  AdminOrganizationsRepository,
  type OrganizationWithUserCount,
} from './admin-organizations.repository';
import { ORG_ENTITY_REGISTRY } from './org-entities.registry';
import { AdminAuditService } from '../audit/admin-audit.service';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';

@Injectable()
export class AdminOrganizationsService {
  constructor(
    private readonly orgsRepository: AdminOrganizationsRepository,
    private readonly auditService: AdminAuditService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async list(limit: number, offset: number, search?: string): Promise<Paginated<AdminOrganization>> {
    const { items, total } = await this.orgsRepository.list(limit, offset, search);
    return { items: items.map(toPublic), total };
  }

  async getById(id: string): Promise<AdminOrganization> {
    const org = await this.orgsRepository.findById(id);
    if (!org) throw new NotFoundException('Organization not found');
    return toPublic(org);
  }

  async update(id: string, dto: UpdateOrganizationDto, adminUserId: string): Promise<AdminOrganization> {
    const org = await this.requireOrg(id);

    const changes: Partial<Pick<Organization, 'name' | 'slug'>> = {};
    if (dto.name !== undefined && dto.name !== org.name) changes.name = dto.name;
    if (dto.slug !== undefined && dto.slug !== org.slug) {
      if (await this.orgsRepository.isSlugTakenByOther(dto.slug, id)) {
        throw new ConflictException('Slug is already in use');
      }
      changes.slug = dto.slug;
    }

    if (Object.keys(changes).length === 0) return toPublic(org);

    const updated = await this.orgsRepository.update(id, changes);
    await this.auditService.record({
      adminUserId,
      action: 'organization.update',
      entityType: 'organization',
      entityId: id,
      organizationId: id,
      before: pick(org as unknown as Record<string, unknown>, Object.keys(changes)),
      after: changes,
    });
    return toPublic({ ...updated, userCount: org.userCount });
  }

  async disable(id: string, adminUserId: string): Promise<AdminOrganization> {
    return this.setActive(id, false, adminUserId);
  }

  async enable(id: string, adminUserId: string): Promise<AdminOrganization> {
    return this.setActive(id, true, adminUserId);
  }

  async softDelete(id: string, adminUserId: string): Promise<AdminOrganization> {
    const org = await this.requireOrg(id);
    if (org.deletedAt) throw new BadRequestException('Organization is already deleted');

    const updated = await this.orgsRepository.update(id, { deletedAt: new Date(), isActive: false });
    await this.auditService.record({
      adminUserId,
      action: 'organization.soft_delete',
      entityType: 'organization',
      entityId: id,
      organizationId: id,
      before: { deletedAt: null, isActive: org.isActive },
      after: { deletedAt: updated.deletedAt?.toISOString() ?? null, isActive: false },
    });
    return toPublic({ ...updated, userCount: org.userCount });
  }

  async restore(id: string, adminUserId: string): Promise<AdminOrganization> {
    const org = await this.requireOrg(id);
    if (!org.deletedAt) throw new BadRequestException('Organization is not deleted');

    const updated = await this.orgsRepository.update(id, { deletedAt: null, isActive: true });
    await this.auditService.record({
      adminUserId,
      action: 'organization.restore',
      entityType: 'organization',
      entityId: id,
      organizationId: id,
      before: { deletedAt: org.deletedAt.toISOString(), isActive: org.isActive },
      after: { deletedAt: null, isActive: true },
    });
    return toPublic({ ...updated, userCount: org.userCount });
  }

  async listEntities(
    orgId: string,
    entityType: AdminOrgEntityType,
    limit: number,
    offset: number,
  ): Promise<Paginated<Record<string, unknown>>> {
    await this.requireOrg(orgId);

    const config = ORG_ENTITY_REGISTRY[entityType];
    if (!config) throw new BadRequestException('Unknown entity type');

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(config.table)
        .where(eq(config.orgColumn, orgId))
        .orderBy(desc(config.orderColumn))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ value: count() })
        .from(config.table)
        .where(eq(config.orgColumn, orgId)),
    ]);

    const items = (rows as Record<string, unknown>[]).map((row) => stripKeys(row, config.omit));
    return { items, total: totalRows[0]?.value ?? 0 };
  }

  private async setActive(id: string, isActive: boolean, adminUserId: string): Promise<AdminOrganization> {
    const org = await this.requireOrg(id);
    if (org.isActive === isActive) return toPublic(org);

    const updated = await this.orgsRepository.update(id, { isActive });
    await this.auditService.record({
      adminUserId,
      action: isActive ? 'organization.enable' : 'organization.disable',
      entityType: 'organization',
      entityId: id,
      organizationId: id,
      before: { isActive: org.isActive },
      after: { isActive },
    });
    return toPublic({ ...updated, userCount: org.userCount });
  }

  private async requireOrg(id: string): Promise<OrganizationWithUserCount> {
    const org = await this.orgsRepository.findById(id);
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }
}

function toPublic(org: OrganizationWithUserCount): AdminOrganization {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    isActive: org.isActive,
    deletedAt: org.deletedAt?.toISOString() ?? null,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
    userCount: org.userCount,
  };
}

function pick(source: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(keys.map((key) => [key, source[key]]));
}

function stripKeys(row: Record<string, unknown>, omit: readonly string[]): Record<string, unknown> {
  if (omit.length === 0) return row;
  const clone = { ...row };
  for (const key of omit) delete clone[key];
  return clone;
}
