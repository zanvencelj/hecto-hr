import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminSessionInfo,
  AdminUser,
  ForgotPasswordResponse,
  Paginated,
} from '@hecto/shared-types';
import { AuthService } from '@hecto/auth';
import type { Session } from '@hecto/database';
import { AdminUsersRepository, type AdminUserRow } from './admin-users.repository';
import { AdminAuditService } from '../audit/admin-audit.service';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly usersRepository: AdminUsersRepository,
    private readonly authService: AuthService,
    private readonly auditService: AdminAuditService,
  ) {}

  async list(
    limit: number,
    offset: number,
    search?: string,
    organizationId?: string,
  ): Promise<Paginated<AdminUser>> {
    const { items, total } = await this.usersRepository.list(limit, offset, search, organizationId);
    return { items: items.map(toPublic), total };
  }

  async getById(id: string): Promise<AdminUser> {
    return toPublic(await this.requireUser(id));
  }

  async update(id: string, dto: UpdateUserDto, adminUserId: string): Promise<AdminUser> {
    const user = await this.requireEditableUser(id);

    const changes: Record<string, unknown> = {};
    if (dto.firstName !== undefined && dto.firstName !== user.firstName) changes['firstName'] = dto.firstName;
    if (dto.lastName !== undefined && dto.lastName !== user.lastName) changes['lastName'] = dto.lastName;
    if (dto.username !== undefined && dto.username !== user.username) changes['username'] = dto.username;
    if (dto.role !== undefined && dto.role !== user.role) changes['role'] = dto.role;

    if (Object.keys(changes).length === 0) return toPublic(user);

    await this.usersRepository.update(id, changes);
    await this.auditService.record({
      adminUserId,
      action: 'user.update',
      entityType: 'user',
      entityId: id,
      organizationId: user.organizationId,
      before: pick(user as unknown as Record<string, unknown>, Object.keys(changes)),
      after: changes,
    });
    return this.getById(id);
  }

  async disable(id: string, adminUserId: string): Promise<AdminUser> {
    return this.setActive(id, false, adminUserId);
  }

  async enable(id: string, adminUserId: string): Promise<AdminUser> {
    return this.setActive(id, true, adminUserId);
  }

  async softDelete(id: string, adminUserId: string): Promise<AdminUser> {
    const user = await this.requireEditableUser(id);
    if (user.deletedAt) throw new BadRequestException('User is already deleted');

    await this.usersRepository.update(id, { deletedAt: new Date(), isActive: false });
    await this.usersRepository.deactivateAllSessions(id);
    await this.auditService.record({
      adminUserId,
      action: 'user.soft_delete',
      entityType: 'user',
      entityId: id,
      organizationId: user.organizationId,
      before: { deletedAt: null, isActive: user.isActive },
      after: { deletedAt: new Date().toISOString(), isActive: false },
    });
    return this.getById(id);
  }

  async restore(id: string, adminUserId: string): Promise<AdminUser> {
    const user = await this.requireEditableUser(id);
    if (!user.deletedAt) throw new BadRequestException('User is not deleted');

    await this.usersRepository.update(id, { deletedAt: null, isActive: true });
    await this.auditService.record({
      adminUserId,
      action: 'user.restore',
      entityType: 'user',
      entityId: id,
      organizationId: user.organizationId,
      before: { deletedAt: user.deletedAt.toISOString(), isActive: user.isActive },
      after: { deletedAt: null, isActive: true },
    });
    return this.getById(id);
  }

  async revokeSessions(id: string, adminUserId: string): Promise<void> {
    const user = await this.requireEditableUser(id);
    await this.usersRepository.deactivateAllSessions(id);
    await this.auditService.record({
      adminUserId,
      action: 'user.revoke_sessions',
      entityType: 'user',
      entityId: id,
      organizationId: user.organizationId,
    });
  }

  async forcePasswordReset(id: string, adminUserId: string): Promise<ForgotPasswordResponse> {
    const user = await this.requireEditableUser(id);
    if (user.deletedAt) throw new BadRequestException('User is deleted');

    const response = await this.authService.forgotPassword(user.email);
    await this.auditService.record({
      adminUserId,
      action: 'user.force_password_reset',
      entityType: 'user',
      entityId: id,
      organizationId: user.organizationId,
    });
    return response;
  }

  async listSessions(id: string): Promise<AdminSessionInfo[]> {
    await this.requireUser(id);
    const rows = await this.usersRepository.listSessions(id);
    return rows.map(toSessionInfo);
  }

  private async setActive(id: string, isActive: boolean, adminUserId: string): Promise<AdminUser> {
    const user = await this.requireEditableUser(id);
    if (user.isActive === isActive) return toPublic(user);

    await this.usersRepository.update(id, { isActive });
    await this.auditService.record({
      adminUserId,
      action: isActive ? 'user.enable' : 'user.disable',
      entityType: 'user',
      entityId: id,
      organizationId: user.organizationId,
      before: { isActive: user.isActive },
      after: { isActive },
    });
    return this.getById(id);
  }

  private async requireUser(id: string): Promise<AdminUserRow> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Superadmin accounts are managed exclusively via the CLI script — never through this API. */
  private async requireEditableUser(id: string): Promise<AdminUserRow> {
    const user = await this.requireUser(id);
    if (user.role === 'superadmin') {
      throw new ForbiddenException('Superadmin accounts cannot be modified through the admin API');
    }
    return user;
  }
}

function toPublic(user: AdminUserRow): AdminUser {
  return {
    id: user.id,
    organizationId: user.organizationId,
    organizationName: user.organizationName,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    deletedAt: user.deletedAt?.toISOString() ?? null,
    dateJoined: user.dateJoined.toISOString(),
    lastLogin: user.lastLogin?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

function toSessionInfo(session: Session): AdminSessionInfo {
  return {
    id: session.id,
    deviceName: session.deviceName,
    platform: session.platform,
    ipAddress: session.ipAddress,
    isActive: session.isActive,
    lastUsedAt: session.lastUsedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
  };
}

function pick(source: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(keys.map((key) => [key, source[key]]));
}
