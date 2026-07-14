import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import type { AccessTokenPayload, EmployeePublic, InvitationPublic } from '@hecto/shared-types';
import { UsersService } from '@hecto/users';
import { TasksQueueService } from '@hecto/queue';
import { EmployeesRepository } from './employees.repository';
import { InvitationsRepository } from './invitations.repository';
import { InviteEmployeeDto } from './dto/invite-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly invitationsRepo: InvitationsRepository,
    private readonly usersService: UsersService,
    private readonly queue: TasksQueueService,
    private readonly config: ConfigService,
  ) {}

  async listEmployees(organizationId: string, search?: string): Promise<EmployeePublic[]> {
    const employees = await this.employeesRepo.findAllInOrg(organizationId, search);
    return employees.map((e) => this.toPublic(e));
  }

  async getEmployee(id: string, organizationId: string): Promise<EmployeePublic> {
    const employee = await this.employeesRepo.findByIdInOrg(id, organizationId);
    if (!employee) throw new NotFoundException('Employee not found');
    return this.toPublic(employee);
  }

  async getOwnProfile(currentUser: AccessTokenPayload): Promise<EmployeePublic> {
    const employee = await this.employeesRepo.findByIdInOrg(
      currentUser.sub,
      currentUser.organizationId,
    );
    if (!employee) throw new NotFoundException('Profile not found');
    return this.toPublic(employee);
  }

  async updateEmployee(
    id: string,
    organizationId: string,
    dto: UpdateEmployeeDto,
  ): Promise<EmployeePublic> {
    const employee = await this.employeesRepo.findByIdInOrg(id, organizationId);
    if (!employee) throw new NotFoundException('Employee not found');

    const { firstName, lastName, role, isActive, position, department, phone, hireDate, maxHoursPerWeek, notes } =
      dto;

    if (firstName !== undefined || lastName !== undefined || role !== undefined || isActive !== undefined) {
      await this.usersService.updateUserFields(id, { firstName, lastName, role, isActive });
    }

    if (
      position !== undefined ||
      department !== undefined ||
      phone !== undefined ||
      hireDate !== undefined ||
      maxHoursPerWeek !== undefined ||
      notes !== undefined
    ) {
      await this.employeesRepo.updateProfile(id, {
        position,
        department,
        phone,
        hireDate,
        maxHoursPerWeek,
        notes,
      });
    }

    const updated = await this.employeesRepo.findByIdInOrg(id, organizationId);
    return this.toPublic(updated!);
  }

  async inviteEmployee(
    dto: InviteEmployeeDto,
    invitedBy: AccessTokenPayload,
  ): Promise<InvitationPublic> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('A user with this email already exists');

    const pendingInvite = await this.invitationsRepo.findByEmailAndOrg(
      dto.email,
      invitedBy.organizationId,
    );
    if (pendingInvite) throw new ConflictException('An invitation for this email is already pending');

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await this.invitationsRepo.create({
      organizationId: invitedBy.organizationId,
      invitedByUserId: invitedBy.sub,
      email: dto.email.toLowerCase(),
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      role: dto.role ?? 'employee',
      tokenHash,
      expiresAt,
    });

    const appUrl = this.config.getOrThrow<string>('APP_URL');
    const inviteLink = `${appUrl}/auth/accept-invite?token=${token}`;
    const inviter = await this.usersService.findById(invitedBy.sub);
    const inviterName =
      inviter.firstName && inviter.lastName
        ? `${inviter.firstName} ${inviter.lastName}`
        : inviter.email;

    const org = await this.employeesRepo.findOrg(invitedBy.organizationId);
    const organizationName = org?.name ?? 'your organization';

    await this.queue.sendInvitationEmail(
      dto.email,
      dto.firstName ?? null,
      inviteLink,
      organizationName,
      inviterName,
    );

    return this.toInvitationPublic(invitation);
  }

  async acceptInvitation(token: string, password: string): Promise<string> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invitation = await this.invitationsRepo.findByTokenHash(tokenHash);

    if (!invitation) throw new BadRequestException('Invalid or expired invitation');
    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    const existing = await this.usersService.findByEmail(invitation.email);
    if (existing) throw new ConflictException('An account with this email already exists');

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await this.usersService.createFromVerifiedEmail({
      email: invitation.email,
      passwordHash,
      organizationId: invitation.organizationId,
      role: invitation.role,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
    });

    await this.employeesRepo.upsertProfile({
      userId: user.id,
      organizationId: invitation.organizationId,
      invitationId: invitation.id,
    });

    await this.invitationsRepo.markAccepted(invitation.id, user.id);
    await this.queue.sendWelcomeEmail(user.email, user.firstName);

    return user.email;
  }

  async listInvitations(organizationId: string): Promise<InvitationPublic[]> {
    const invitations = await this.invitationsRepo.findAllByOrg(organizationId);
    return invitations.map((i) => this.toInvitationPublic(i));
  }

  async cancelInvitation(id: string, organizationId: string): Promise<void> {
    const invitations = await this.invitationsRepo.findAllByOrg(organizationId);
    const invitation = invitations.find((i) => i.id === id);
    if (!invitation || invitation.organizationId !== organizationId) {
      throw new NotFoundException('Invitation not found');
    }
    await this.invitationsRepo.markCancelled(id);
  }

  private toPublic(employee: {
    id: string;
    organizationId: string | null;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    isActive: boolean;
    dateJoined: Date;
    lastLogin: Date | null;
    profile: {
      position: string | null;
      department: string | null;
      phone: string | null;
      hireDate: string | null;
      maxHoursPerWeek: number | null;
      notes: string | null;
      emergencyContact: { name: string; phone: string; relationship: string } | null;
    } | null;
  }): EmployeePublic {
    return {
      id: employee.id,
      organizationId: employee.organizationId ?? '',
      email: employee.email,
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: employee.role as EmployeePublic['role'],
      isActive: employee.isActive,
      dateJoined: employee.dateJoined.toISOString(),
      lastLogin: employee.lastLogin?.toISOString() ?? null,
      position: employee.profile?.position ?? null,
      department: employee.profile?.department ?? null,
      phone: employee.profile?.phone ?? null,
      hireDate: employee.profile?.hireDate ?? null,
      maxHoursPerWeek: employee.profile?.maxHoursPerWeek ?? null,
      notes: employee.profile?.notes ?? null,
      emergencyContact: employee.profile?.emergencyContact ?? null,
    };
  }

  private toInvitationPublic(invitation: {
    id: string;
    organizationId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    status: string;
    expiresAt: Date;
    createdAt: Date;
    acceptedUserId: string | null;
    invitedByUserId: string | null;
  }): InvitationPublic {
    return {
      id: invitation.id,
      organizationId: invitation.organizationId,
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      role: invitation.role as InvitationPublic['role'],
      status: invitation.status as InvitationPublic['status'],
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
    };
  }
}
