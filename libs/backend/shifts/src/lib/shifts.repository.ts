import { Inject, Injectable } from '@nestjs/common';
import { and, between, eq, gte, inArray, isNull } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type Database,
  shifts,
  type Shift,
  type NewShift,
  shiftBreaks,
  type ShiftBreak,
  type NewShiftBreak,
  recurringShifts,
  type RecurringShift,
  type NewRecurringShift,
  employeeAvailability,
  type EmployeeAvailability,
  type NewEmployeeAvailability,
  scheduleDrafts,
  schedulingSettings,
} from '@hecto/database';

export interface ShiftWithBreaks extends Shift {
  breaks: ShiftBreak[];
}

@Injectable()
export class ShiftsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async createShift(data: NewShift): Promise<Shift> {
    const result = await this.db.insert(shifts).values(data).returning();
    return result[0]!;
  }

  async updateShift(id: string, data: Partial<Omit<Shift, 'id' | 'createdAt'>>): Promise<Shift> {
    const result = await this.db
      .update(shifts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(shifts.id, id))
      .returning();
    return result[0]!;
  }

  async deleteShift(id: string): Promise<void> {
    await this.db.delete(shifts).where(eq(shifts.id, id));
  }

  async findShiftById(id: string, organizationId: string): Promise<ShiftWithBreaks | null> {
    const shift = await this.db
      .select()
      .from(shifts)
      .where(and(eq(shifts.id, id), eq(shifts.organizationId, organizationId)))
      .limit(1);
    if (!shift[0]) return null;

    const breaks = await this.db
      .select()
      .from(shiftBreaks)
      .where(eq(shiftBreaks.shiftId, id));

    return { ...shift[0], breaks };
  }

  async findShiftsForEmployee(
    userId: string,
    organizationId: string,
    from: string,
    to: string,
  ): Promise<ShiftWithBreaks[]> {
    const rows = await this.db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.userId, userId),
          eq(shifts.organizationId, organizationId),
          between(shifts.date, from, to),
        ),
      );

    const shiftIds = rows.map((s) => s.id);
    const allBreaks = shiftIds.length
      ? await this.db
          .select()
          .from(shiftBreaks)
          .where(
            shiftIds.length === 1
              ? eq(shiftBreaks.shiftId, shiftIds[0]!)
              : inArray(shiftBreaks.shiftId, shiftIds),
          )
      : [];

    return rows.map((s) => ({
      ...s,
      breaks: allBreaks.filter((b) => b.shiftId === s.id),
    }));
  }

  async findShiftsForOrg(
    organizationId: string,
    from: string,
    to: string,
  ): Promise<ShiftWithBreaks[]> {
    const rows = await this.db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.organizationId, organizationId),
          between(shifts.date, from, to),
        ),
      );

    const shiftIds = rows.map((s) => s.id);
    const allBreaks = shiftIds.length
      ? await this.db
          .select()
          .from(shiftBreaks)
          .where(
            shiftIds.length === 1
              ? eq(shiftBreaks.shiftId, shiftIds[0]!)
              : inArray(shiftBreaks.shiftId, shiftIds),
          )
      : [];

    return rows.map((s) => ({
      ...s,
      breaks: allBreaks.filter((b) => b.shiftId === s.id),
    }));
  }

  async createBreak(data: NewShiftBreak): Promise<ShiftBreak> {
    const result = await this.db.insert(shiftBreaks).values(data).returning();
    return result[0]!;
  }

  async updateBreak(id: string, data: Partial<Omit<ShiftBreak, 'id' | 'createdAt'>>): Promise<ShiftBreak> {
    const result = await this.db
      .update(shiftBreaks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(shiftBreaks.id, id))
      .returning();
    return result[0]!;
  }

  async deleteBreak(id: string): Promise<void> {
    await this.db.delete(shiftBreaks).where(eq(shiftBreaks.id, id));
  }

  async createRecurringShift(data: NewRecurringShift): Promise<RecurringShift> {
    const result = await this.db.insert(recurringShifts).values(data).returning();
    return result[0]!;
  }

  async bulkCreateShifts(data: NewShift[]): Promise<void> {
    if (data.length === 0) return;
    await this.db.insert(shifts).values(data);
  }

  async deleteShiftsForUser(
    userId: string,
    organizationId: string,
    fromDate?: string,
  ): Promise<void> {
    const conditions = [eq(shifts.userId, userId), eq(shifts.organizationId, organizationId)];
    if (fromDate) conditions.push(gte(shifts.date, fromDate));
    await this.db.delete(shifts).where(and(...conditions));
  }

  async findShiftsForEmployeeOnDate(
    userId: string,
    organizationId: string,
    date: string,
  ): Promise<Shift[]> {
    return this.db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.userId, userId),
          eq(shifts.organizationId, organizationId),
          eq(shifts.date, date),
        ),
      );
  }

  async findOpenShifts(organizationId: string, from: string, to: string): Promise<Shift[]> {
    return this.db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.organizationId, organizationId),
          eq(shifts.isOpen, true),
          isNull(shifts.userId),
          between(shifts.date, from, to),
        ),
      );
  }

  /** True when an active draft exists and org settings disable claiming during a draft. */
  async isClaimingBlockedByDraft(organizationId: string): Promise<boolean> {
    const settings = await this.db
      .select()
      .from(schedulingSettings)
      .where(eq(schedulingSettings.organizationId, organizationId))
      .limit(1);
    if (settings[0]?.allowClaimingDuringDraft !== false) return false;

    const activeDrafts = await this.db
      .select({ id: scheduleDrafts.id })
      .from(scheduleDrafts)
      .where(
        and(eq(scheduleDrafts.organizationId, organizationId), eq(scheduleDrafts.status, 'draft')),
      )
      .limit(1);
    return activeDrafts.length > 0;
  }

  async claimShift(id: string, userId: string): Promise<Shift> {
    const result = await this.db
      .update(shifts)
      .set({ userId, isOpen: false, updatedAt: new Date() })
      .where(and(eq(shifts.id, id), eq(shifts.isOpen, true), isNull(shifts.userId)))
      .returning();
    return result[0]!;
  }

  async upsertAvailability(data: NewEmployeeAvailability): Promise<EmployeeAvailability> {
    const result = await this.db
      .insert(employeeAvailability)
      .values(data)
      .onConflictDoUpdate({
        target: [employeeAvailability.userId, employeeAvailability.dayOfWeek],
        set: {
          preference: data.preference,
          timeFrom: data.timeFrom ?? null,
          timeTo: data.timeTo ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0]!;
  }

  async findAvailabilityForUser(userId: string): Promise<EmployeeAvailability[]> {
    return this.db
      .select()
      .from(employeeAvailability)
      .where(eq(employeeAvailability.userId, userId));
  }

  async findAvailabilityForOrg(organizationId: string): Promise<EmployeeAvailability[]> {
    return this.db
      .select()
      .from(employeeAvailability)
      .where(eq(employeeAvailability.organizationId, organizationId));
  }
}
