import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AccessTokenPayload,
  LeaveTypePublic,
  LeaveBalancePublic,
  LeaveRequestPublic,
} from '@hecto/shared-types';
import { LeaveRepository } from './leave.repository';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ReviewLeaveRequestDto } from './dto/review-leave-request.dto';
import { SetLeaveBalanceDto } from './dto/set-leave-balance.dto';
import type { LeaveRequest, LeaveType } from '@hecto/database';

const MANAGER_ROLES = ['admin', 'hr', 'manager'];

export function countWeekdays(startDate: string, endDate: string): number {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

@Injectable()
export class LeaveService {
  constructor(private readonly leaveRepo: LeaveRepository) {}

  async getLeaveTypes(organizationId: string): Promise<LeaveTypePublic[]> {
    const types = await this.leaveRepo.findLeaveTypesByOrg(organizationId);
    return types.map((t) => this.toTypePublic(t));
  }

  async setLeaveBalance(
    dto: SetLeaveBalanceDto,
    currentUser: AccessTokenPayload,
  ): Promise<LeaveBalancePublic> {
    const balance = await this.leaveRepo.upsertBalance(
      dto.userId,
      currentUser.organizationId,
      dto.leaveTypeId,
      dto.year,
      dto.totalDays.toString(),
    );

    const balancesWithType = await this.leaveRepo.findBalancesForEmployee(
      dto.userId,
      currentUser.organizationId,
      dto.year,
    );
    const updated = balancesWithType.find((b) => b.id === balance.id);
    if (!updated) throw new NotFoundException('Balance not found');
    return this.toBalancePublic(updated);
  }

  async getBalancesForEmployee(
    userId: string,
    year: number,
    currentUser: AccessTokenPayload,
  ): Promise<LeaveBalancePublic[]> {
    const isManager = MANAGER_ROLES.includes(currentUser.role);
    if (!isManager && currentUser.sub !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const [leaveTypes, existing] = await Promise.all([
      this.leaveRepo.findLeaveTypesByOrg(currentUser.organizationId),
      this.leaveRepo.findBalancesForEmployee(userId, currentUser.organizationId, year),
    ]);

    const byTypeId = new Map(existing.map((b) => [b.leaveTypeId, b]));

    return leaveTypes.map((lt) => {
      const b = byTypeId.get(lt.id);
      if (b) return this.toBalancePublic(b);
      return {
        id: `virtual-${userId}-${lt.id}-${year}`,
        userId,
        organizationId: currentUser.organizationId,
        leaveTypeId: lt.id,
        leaveTypeName: lt.name,
        leaveTypeCode: lt.code,
        leaveTypeColor: lt.color,
        year,
        totalDays: null,
        usedDays: '0',
        pendingDays: '0',
      };
    });
  }

  async getAllBalancesForOrg(
    year: number,
    currentUser: AccessTokenPayload,
  ): Promise<LeaveBalancePublic[]> {
    const balances = await this.leaveRepo.findAllBalancesForOrg(currentUser.organizationId, year);
    return balances.map((b) => this.toBalancePublic(b));
  }

  async createLeaveRequest(
    dto: CreateLeaveRequestDto,
    currentUser: AccessTokenPayload,
  ): Promise<LeaveRequestPublic> {
    const isManager = MANAGER_ROLES.includes(currentUser.role);

    if (!isManager && currentUser.sub !== dto.userId) {
      throw new ForbiddenException('Employees can only request leave for themselves');
    }

    const totalDays = countWeekdays(dto.startDate, dto.endDate);
    if (totalDays <= 0) throw new BadRequestException('Invalid date range');

    const isManualEntry = isManager && (dto.isManualEntry ?? false);

    const request = await this.leaveRepo.createRequest({
      userId: dto.userId,
      organizationId: currentUser.organizationId,
      leaveTypeId: dto.leaveTypeId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      totalDays: totalDays.toString(),
      status: isManualEntry ? 'approved' : 'pending',
      requestedByUserId: currentUser.sub,
      isManualEntry,
      notes: dto.notes ?? null,
      reviewedByUserId: isManualEntry ? currentUser.sub : null,
      reviewedAt: isManualEntry ? new Date() : null,
    });

    const year = new Date(dto.startDate).getFullYear();
    if (isManualEntry) {
      await this.leaveRepo.adjustUsedDays(
        dto.userId, currentUser.organizationId, dto.leaveTypeId, year, totalDays.toString(), '0',
      );
    } else {
      await this.leaveRepo.adjustUsedDays(
        dto.userId, currentUser.organizationId, dto.leaveTypeId, year, '0', totalDays.toString(),
      );
    }

    return this.toRequestPublic(request);
  }

  async reviewLeaveRequest(
    id: string,
    dto: ReviewLeaveRequestDto,
    currentUser: AccessTokenPayload,
  ): Promise<LeaveRequestPublic> {
    const request = await this.leaveRepo.findRequestById(id);
    if (!request) throw new NotFoundException('Leave request not found');
    if (request.organizationId !== currentUser.organizationId) {
      throw new ForbiddenException('Access denied');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('Request is not pending');
    }

    const updated = await this.leaveRepo.updateRequest(id, {
      status: dto.status,
      reviewedByUserId: currentUser.sub,
      reviewedAt: new Date(),
      reviewNotes: dto.reviewNotes ?? null,
    });

    const year = new Date(request.startDate).getFullYear();
    if (dto.status === 'approved') {
      await this.leaveRepo.adjustUsedDays(
        request.userId, request.organizationId, request.leaveTypeId, year,
        request.totalDays, `-${request.totalDays}`,
      );
    } else {
      await this.leaveRepo.adjustUsedDays(
        request.userId, request.organizationId, request.leaveTypeId, year,
        '0', `-${request.totalDays}`,
      );
    }

    const withType = await this.leaveRepo.findRequestById(updated.id);
    return this.toRequestPublic(withType!);
  }

  async getLeaveRequestsForOrg(
    currentUser: AccessTokenPayload,
    status?: string,
  ): Promise<LeaveRequestPublic[]> {
    const requests = await this.leaveRepo.findRequestsForOrg(currentUser.organizationId, status);
    return requests.map((r) => this.toRequestPublic(r));
  }

  async getLeaveRequestsForEmployee(
    userId: string,
    currentUser: AccessTokenPayload,
  ): Promise<LeaveRequestPublic[]> {
    const isManager = MANAGER_ROLES.includes(currentUser.role);
    if (!isManager && currentUser.sub !== userId) {
      throw new ForbiddenException('Access denied');
    }
    const requests = await this.leaveRepo.findRequestsForEmployee(
      userId,
      currentUser.organizationId,
    );
    return requests.map((r) => this.toRequestPublic(r));
  }

  async cancelLeaveRequest(id: string, currentUser: AccessTokenPayload): Promise<void> {
    const request = await this.leaveRepo.findRequestById(id);
    if (!request) throw new NotFoundException('Leave request not found');
    if (request.organizationId !== currentUser.organizationId) {
      throw new ForbiddenException('Access denied');
    }

    const isManager = MANAGER_ROLES.includes(currentUser.role);
    if (!isManager && request.userId !== currentUser.sub) {
      throw new ForbiddenException('Access denied');
    }
    if (!['pending', 'approved'].includes(request.status)) {
      throw new BadRequestException('Cannot cancel this request');
    }

    await this.leaveRepo.updateRequest(id, { status: 'cancelled' });

    const year = new Date(request.startDate).getFullYear();
    if (request.status === 'pending') {
      await this.leaveRepo.adjustUsedDays(
        request.userId, request.organizationId, request.leaveTypeId, year,
        '0', `-${request.totalDays}`,
      );
    } else if (request.status === 'approved') {
      await this.leaveRepo.adjustUsedDays(
        request.userId, request.organizationId, request.leaveTypeId, year,
        `-${request.totalDays}`, '0',
      );
    }
  }

  async seedLeaveTypes(organizationId: string): Promise<void> {
    await this.leaveRepo.seedDefaultLeaveTypes(organizationId);
  }

  private toTypePublic(t: LeaveType): LeaveTypePublic {
    return {
      id: t.id,
      organizationId: t.organizationId ?? null,
      name: t.name,
      code: t.code,
      color: t.color,
      defaultDaysPerYear: t.defaultDaysPerYear,
      isPaid: t.isPaid,
      isActive: t.isActive,
    };
  }

  private toBalancePublic(b: {
    id: string;
    userId: string;
    organizationId: string;
    leaveTypeId: string;
    typeName: string;
    typeCode: string;
    typeColor: string;
    year: number;
    totalDays: string;
    usedDays: string;
    pendingDays: string;
  }): LeaveBalancePublic {
    return {
      id: b.id,
      userId: b.userId,
      organizationId: b.organizationId,
      leaveTypeId: b.leaveTypeId,
      leaveTypeName: b.typeName,
      leaveTypeCode: b.typeCode,
      leaveTypeColor: b.typeColor,
      year: b.year,
      totalDays: parseFloat(b.totalDays) > 0 ? b.totalDays : null,
      usedDays: b.usedDays,
      pendingDays: b.pendingDays,
    };
  }

  async editRequestDays(
    id: string,
    newTotalDays: number,
    currentUser: AccessTokenPayload,
  ): Promise<LeaveRequestPublic> {
    const request = await this.leaveRepo.findRequestById(id);
    if (!request) throw new NotFoundException('Leave request not found');
    if (request.organizationId !== currentUser.organizationId) {
      throw new ForbiddenException('Access denied');
    }
    if (newTotalDays <= 0) throw new BadRequestException('totalDays must be > 0');

    const oldDays = parseFloat(request.totalDays);
    const delta = newTotalDays - oldDays;
    const year = new Date(request.startDate).getFullYear();

    await this.leaveRepo.updateRequest(id, {
      totalDays: newTotalDays.toString(),
      isEdited: true,
      editedByUserId: currentUser.sub,
      editedAt: new Date(),
    });

    if (request.status === 'approved') {
      await this.leaveRepo.adjustUsedDays(
        request.userId, request.organizationId, request.leaveTypeId, year,
        delta.toString(), '0',
      );
    } else if (request.status === 'pending') {
      await this.leaveRepo.adjustUsedDays(
        request.userId, request.organizationId, request.leaveTypeId, year,
        '0', delta.toString(),
      );
    }

    const updated = await this.leaveRepo.findRequestById(id);
    return this.toRequestPublic(updated!);
  }

  private toRequestPublic(r: {
    id: string;
    userId: string;
    employeeName: string;
    organizationId: string;
    leaveTypeId: string;
    typeName: string;
    typeCode: string;
    typeColor: string;
    startDate: string;
    endDate: string;
    totalDays: string;
    status: LeaveRequest['status'];
    requestedByUserId: string;
    reviewedByUserId: string | null;
    reviewedAt: Date | null;
    isManualEntry: boolean;
    isEdited: boolean;
    editedAt: Date | null;
    editedByUserId: string | null;
    notes: string | null;
    reviewNotes: string | null;
    createdAt: Date;
  }): LeaveRequestPublic {
    return {
      id: r.id,
      userId: r.userId,
      employeeName: r.employeeName,
      organizationId: r.organizationId,
      leaveTypeId: r.leaveTypeId,
      leaveTypeName: r.typeName,
      leaveTypeCode: r.typeCode,
      leaveTypeColor: r.typeColor,
      startDate: r.startDate,
      endDate: r.endDate,
      totalDays: r.totalDays,
      status: r.status,
      requestedByUserId: r.requestedByUserId,
      reviewedByUserId: r.reviewedByUserId,
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      isManualEntry: r.isManualEntry,
      isEdited: r.isEdited,
      editedAt: r.editedAt?.toISOString() ?? null,
      editedByUserId: r.editedByUserId,
      notes: r.notes,
      reviewNotes: r.reviewNotes,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
