import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import type { AccessTokenPayload, ShiftPublic, ShiftBreakPublic } from '@hecto/shared-types';
import { ShiftsRepository } from './shifts.repository';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { CreateShiftBreakDto } from './dto/create-shift-break.dto';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import type { Shift, ShiftBreak, EmployeeAvailability } from '@hecto/database';

const MANAGER_ROLES = ['admin', 'hr', 'manager'];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0]!;
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay();
}

function shiftTimesOverlap(
  a: { startTime: string; endTime: string },
  b: { startTime: string; endTime: string },
): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

@Injectable()
export class ShiftsService {
  constructor(private readonly shiftsRepo: ShiftsRepository) {}

  async createShift(dto: CreateShiftDto, currentUser: AccessTokenPayload): Promise<ShiftPublic> {
    if (dto.isRecurring && dto.recurringDays?.length) {
      return this.createRecurringShifts(dto, currentUser);
    }

    const shift = await this.shiftsRepo.createShift({
      userId: dto.userId ?? null,
      organizationId: currentUser.organizationId,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      isOpen: dto.isOpen ?? !dto.userId,
      notes: dto.notes ?? null,
      createdByUserId: currentUser.sub,
    });

    return this.toPublic({ ...shift, breaks: [] });
  }

  private async createRecurringShifts(
    dto: CreateShiftDto,
    currentUser: AccessTokenPayload,
  ): Promise<ShiftPublic> {
    const recurringShift = await this.shiftsRepo.createRecurringShift({
      userId: dto.userId!,
      organizationId: currentUser.organizationId,
      daysOfWeek: dto.recurringDays!,
      startTime: dto.startTime,
      endTime: dto.endTime,
      startDate: dto.recurringStartDate ?? dto.date,
      endDate: dto.recurringEndDate ?? null,
      notes: dto.notes ?? null,
      createdByUserId: currentUser.sub,
    });

    const startDate = dto.recurringStartDate ?? dto.date;
    const endDate = dto.recurringEndDate ?? addDays(startDate, 365);

    const shiftInstances = [];
    let current = startDate;
    while (current <= endDate) {
      if (dto.recurringDays!.includes(getDayOfWeek(current)) && current !== dto.date) {
        shiftInstances.push({
          userId: dto.userId,
          organizationId: currentUser.organizationId,
          date: current,
          startTime: dto.startTime,
          endTime: dto.endTime,
          notes: dto.notes ?? null,
          recurringShiftId: recurringShift.id,
          createdByUserId: currentUser.sub,
        });
      }
      current = addDays(current, 1);
    }

    await this.shiftsRepo.bulkCreateShifts(shiftInstances);

    const firstShift = await this.shiftsRepo.createShift({
      userId: dto.userId,
      organizationId: currentUser.organizationId,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      notes: dto.notes ?? null,
      recurringShiftId: recurringShift.id,
      createdByUserId: currentUser.sub,
    });

    return this.toPublic({ ...firstShift, breaks: [] });
  }

  async updateShift(
    id: string,
    dto: UpdateShiftDto,
    currentUser: AccessTokenPayload,
  ): Promise<ShiftPublic> {
    const existing = await this.shiftsRepo.findShiftById(id, currentUser.organizationId);
    if (!existing) throw new NotFoundException('Shift not found');

    const updated = await this.shiftsRepo.updateShift(id, {
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      notes: dto.notes,
    });

    return this.toPublic({ ...updated, breaks: existing.breaks });
  }

  async deleteShift(id: string, currentUser: AccessTokenPayload): Promise<void> {
    const existing = await this.shiftsRepo.findShiftById(id, currentUser.organizationId);
    if (!existing) throw new NotFoundException('Shift not found');
    await this.shiftsRepo.deleteShift(id);
  }

  async getShiftsForEmployee(
    userId: string,
    currentUser: AccessTokenPayload,
    from: string,
    to: string,
  ): Promise<ShiftPublic[]> {
    const isManager = MANAGER_ROLES.includes(currentUser.role);
    if (!isManager && currentUser.sub !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const shifts = await this.shiftsRepo.findShiftsForEmployee(
      userId,
      currentUser.organizationId,
      from,
      to,
    );
    return shifts.map((s) => this.toPublic(s));
  }

  async getShiftsForOrg(
    currentUser: AccessTokenPayload,
    from: string,
    to: string,
  ): Promise<ShiftPublic[]> {
    const shifts = await this.shiftsRepo.findShiftsForOrg(currentUser.organizationId, from, to);
    return shifts.map((s) => this.toPublic(s));
  }

  async deleteUserShifts(
    userId: string,
    currentUser: AccessTokenPayload,
    future: boolean,
  ): Promise<void> {
    const fromDate = future ? new Date().toISOString().split('T')[0] : undefined;
    await this.shiftsRepo.deleteShiftsForUser(userId, currentUser.organizationId, fromDate);
  }

  async addBreak(
    shiftId: string,
    dto: CreateShiftBreakDto,
    currentUser: AccessTokenPayload,
  ): Promise<ShiftBreakPublic> {
    const shift = await this.shiftsRepo.findShiftById(shiftId, currentUser.organizationId);
    if (!shift) throw new NotFoundException('Shift not found');

    const isManager = MANAGER_ROLES.includes(currentUser.role);
    if (!isManager && shift.userId !== currentUser.sub) {
      throw new ForbiddenException('Access denied');
    }

    const breakRecord = await this.shiftsRepo.createBreak({
      shiftId,
      startTime: dto.startTime ?? null,
      endTime: dto.endTime ?? null,
      durationMinutes: dto.durationMinutes ?? null,
      isFixed: dto.isFixed,
      isPaid: dto.isPaid ?? false,
      notes: dto.notes ?? null,
    });

    return this.toBreakPublic(breakRecord);
  }

  async deleteBreak(
    shiftId: string,
    breakId: string,
    currentUser: AccessTokenPayload,
  ): Promise<void> {
    const shift = await this.shiftsRepo.findShiftById(shiftId, currentUser.organizationId);
    if (!shift) throw new NotFoundException('Shift not found');

    const isManager = MANAGER_ROLES.includes(currentUser.role);
    if (!isManager && shift.userId !== currentUser.sub) {
      throw new ForbiddenException('Access denied');
    }

    await this.shiftsRepo.deleteBreak(breakId);
  }

  async getOpenShifts(
    currentUser: AccessTokenPayload,
    from: string,
    to: string,
  ): Promise<ShiftPublic[]> {
    const openShifts = await this.shiftsRepo.findOpenShifts(currentUser.organizationId, from, to);
    return openShifts.map((s) => this.toPublic({ ...s, breaks: [] }));
  }

  async claimShift(id: string, currentUser: AccessTokenPayload): Promise<ShiftPublic> {
    const blocked = await this.shiftsRepo.isClaimingBlockedByDraft(currentUser.organizationId);
    if (blocked) {
      throw new ConflictException(
        'Shift claiming is paused while a schedule draft is under review',
      );
    }

    const shift = await this.shiftsRepo.findShiftById(id, currentUser.organizationId);
    if (!shift) throw new NotFoundException('Shift not found');

    const sameDayShifts = await this.shiftsRepo.findShiftsForEmployeeOnDate(
      currentUser.sub,
      currentUser.organizationId,
      shift.date,
    );
    const overlaps = sameDayShifts.some((s) => shiftTimesOverlap(s, shift));
    if (overlaps) {
      throw new ConflictException('You already have a shift that overlaps with this one');
    }

    const claimed = await this.shiftsRepo.claimShift(id, currentUser.sub);
    if (!claimed) throw new ConflictException('Shift is no longer available');
    return this.toPublic({ ...claimed, breaks: [] });
  }

  async setAvailability(
    currentUser: AccessTokenPayload,
    dto: SetAvailabilityDto,
  ): Promise<EmployeeAvailability> {
    return this.shiftsRepo.upsertAvailability({
      userId: currentUser.sub,
      organizationId: currentUser.organizationId,
      dayOfWeek: dto.dayOfWeek,
      preference: dto.preference,
      timeFrom: dto.timeFrom ?? null,
      timeTo: dto.timeTo ?? null,
    });
  }

  async getMyAvailability(currentUser: AccessTokenPayload): Promise<EmployeeAvailability[]> {
    return this.shiftsRepo.findAvailabilityForUser(currentUser.sub);
  }

  async getOrgAvailability(currentUser: AccessTokenPayload): Promise<EmployeeAvailability[]> {
    return this.shiftsRepo.findAvailabilityForOrg(currentUser.organizationId);
  }

  private toPublic(shift: Shift & { breaks: ShiftBreak[] }): ShiftPublic {
    return {
      id: shift.id,
      userId: shift.userId,
      organizationId: shift.organizationId,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      notes: shift.notes ?? null,
      recurringShiftId: shift.recurringShiftId ?? null,
      breaks: shift.breaks.map((b) => this.toBreakPublic(b)),
      createdAt: shift.createdAt.toISOString(),
    };
  }

  private toBreakPublic(b: ShiftBreak): ShiftBreakPublic {
    return {
      id: b.id,
      shiftId: b.shiftId,
      startTime: b.startTime ?? null,
      endTime: b.endTime ?? null,
      durationMinutes: b.durationMinutes ?? null,
      isFixed: b.isFixed,
      isPaid: b.isPaid,
      notes: b.notes ?? null,
    };
  }
}
