import { Inject, Injectable } from '@nestjs/common';
import { and, between, eq, gte, inArray, isNotNull, isNull, lte, ne, sql } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type Database,
  schedulingSettings,
  type SchedulingSettings,
  staffingTemplates,
  type StaffingTemplate,
  type NewStaffingTemplate,
  scheduleDrafts,
  type ScheduleDraft,
  type NewScheduleDraft,
  scheduleDraftAssignments,
  type ScheduleDraftAssignment,
  type NewScheduleDraftAssignment,
  shifts,
  type Shift,
  type NewShift,
  users,
  employeeProfiles,
  employeeAvailability,
  type EmployeeAvailability,
  leaveRequests,
  type LeaveRequest,
  pushTokens,
} from '@hecto/database';

export interface CandidateUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  maxHoursPerWeek: number | null;
}

export interface AssignmentWithShift extends ScheduleDraftAssignment {
  shift: Shift;
}

export interface DraftWithAssignments extends ScheduleDraft {
  assignments: AssignmentWithShift[];
}

@Injectable()
export class SchedulingRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  // ── settings ──────────────────────────────────────────────────────────────

  async findSettings(organizationId: string): Promise<SchedulingSettings | null> {
    const rows = await this.db
      .select()
      .from(schedulingSettings)
      .where(eq(schedulingSettings.organizationId, organizationId))
      .limit(1);
    return rows[0] ?? null;
  }

  async upsertSettings(
    organizationId: string,
    patch: Partial<
      Omit<SchedulingSettings, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>
    >,
  ): Promise<SchedulingSettings> {
    const result = await this.db
      .insert(schedulingSettings)
      .values({ organizationId, ...patch })
      .onConflictDoUpdate({
        target: [schedulingSettings.organizationId],
        set: { ...patch, updatedAt: new Date() },
      })
      .returning();
    return result[0]!;
  }

  // ── staffing templates ────────────────────────────────────────────────────

  async findTemplates(organizationId: string): Promise<StaffingTemplate[]> {
    return this.db
      .select()
      .from(staffingTemplates)
      .where(eq(staffingTemplates.organizationId, organizationId));
  }

  async findTemplateById(id: string, organizationId: string): Promise<StaffingTemplate | null> {
    const rows = await this.db
      .select()
      .from(staffingTemplates)
      .where(and(eq(staffingTemplates.id, id), eq(staffingTemplates.organizationId, organizationId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async createTemplate(data: NewStaffingTemplate): Promise<StaffingTemplate> {
    const result = await this.db.insert(staffingTemplates).values(data).returning();
    return result[0]!;
  }

  async updateTemplate(
    id: string,
    data: Partial<Omit<StaffingTemplate, 'id' | 'createdAt'>>,
  ): Promise<StaffingTemplate> {
    const result = await this.db
      .update(staffingTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(staffingTemplates.id, id))
      .returning();
    return result[0]!;
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.db.delete(staffingTemplates).where(eq(staffingTemplates.id, id));
  }

  async findActiveTemplates(organizationId: string): Promise<StaffingTemplate[]> {
    return this.db
      .select()
      .from(staffingTemplates)
      .where(
        and(
          eq(staffingTemplates.organizationId, organizationId),
          eq(staffingTemplates.isActive, true),
        ),
      );
  }

  async countTemplateShiftsForDates(
    templateId: string,
    from: string,
    to: string,
  ): Promise<Map<string, number>> {
    const rows = await this.db
      .select({ date: shifts.date, count: sql<number>`count(*)::int` })
      .from(shifts)
      .where(and(eq(shifts.staffingTemplateId, templateId), between(shifts.date, from, to)))
      .groupBy(shifts.date);
    return new Map(rows.map((r) => [r.date, r.count]));
  }

  async bulkCreateShifts(data: NewShift[]): Promise<void> {
    if (data.length === 0) return;
    await this.db.insert(shifts).values(data);
  }

  // ── drafts ────────────────────────────────────────────────────────────────

  async findActiveDraft(organizationId: string): Promise<DraftWithAssignments | null> {
    const drafts = await this.db
      .select()
      .from(scheduleDrafts)
      .where(
        and(eq(scheduleDrafts.organizationId, organizationId), eq(scheduleDrafts.status, 'draft')),
      )
      .limit(1);
    const draft = drafts[0];
    if (!draft) return null;

    const assignments = await this.findAssignments(draft.id);
    return { ...draft, assignments };
  }

  private async findAssignments(draftId: string): Promise<AssignmentWithShift[]> {
    const rows = await this.db
      .select()
      .from(scheduleDraftAssignments)
      .innerJoin(shifts, eq(scheduleDraftAssignments.shiftId, shifts.id))
      .where(eq(scheduleDraftAssignments.draftId, draftId));
    return rows.map((r) => ({ ...r.schedule_draft_assignments, shift: r.shifts }));
  }

  async discardActiveDrafts(organizationId: string): Promise<void> {
    await this.db
      .update(scheduleDrafts)
      .set({ status: 'discarded', updatedAt: new Date() })
      .where(
        and(eq(scheduleDrafts.organizationId, organizationId), eq(scheduleDrafts.status, 'draft')),
      );
  }

  async createDraft(data: NewScheduleDraft): Promise<ScheduleDraft> {
    const result = await this.db.insert(scheduleDrafts).values(data).returning();
    return result[0]!;
  }

  async insertAssignments(data: NewScheduleDraftAssignment[]): Promise<void> {
    if (data.length === 0) return;
    await this.db.insert(scheduleDraftAssignments).values(data);
  }

  async findAssignmentById(
    id: string,
    organizationId: string,
  ): Promise<(ScheduleDraftAssignment & { draft: ScheduleDraft; shift: Shift }) | null> {
    const rows = await this.db
      .select()
      .from(scheduleDraftAssignments)
      .innerJoin(scheduleDrafts, eq(scheduleDraftAssignments.draftId, scheduleDrafts.id))
      .innerJoin(shifts, eq(scheduleDraftAssignments.shiftId, shifts.id))
      .where(
        and(
          eq(scheduleDraftAssignments.id, id),
          eq(scheduleDrafts.organizationId, organizationId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return { ...row.schedule_draft_assignments, draft: row.schedule_drafts, shift: row.shifts };
  }

  async updateAssignment(
    id: string,
    data: Partial<Pick<ScheduleDraftAssignment, 'userId' | 'status' | 'score' | 'reason'>>,
  ): Promise<ScheduleDraftAssignment> {
    const result = await this.db
      .update(scheduleDraftAssignments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(scheduleDraftAssignments.id, id))
      .returning();
    return result[0]!;
  }

  async markDraftPublished(draftId: string): Promise<void> {
    await this.db
      .update(scheduleDrafts)
      .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(scheduleDrafts.id, draftId));
  }

  // ── solver inputs ─────────────────────────────────────────────────────────

  async findOpenShiftsInRange(organizationId: string, from: string, to: string): Promise<Shift[]> {
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

  async findCandidates(organizationId: string): Promise<CandidateUser[]> {
    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        maxHoursPerWeek: employeeProfiles.maxHoursPerWeek,
      })
      .from(users)
      .leftJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
      .where(
        and(
          eq(users.organizationId, organizationId),
          eq(users.isActive, true),
          ne(users.role, 'superadmin'),
        ),
      );
    return rows;
  }

  async findAvailabilityForOrg(organizationId: string): Promise<EmployeeAvailability[]> {
    return this.db
      .select()
      .from(employeeAvailability)
      .where(eq(employeeAvailability.organizationId, organizationId));
  }

  async findApprovedLeaveOverlapping(
    organizationId: string,
    from: string,
    to: string,
  ): Promise<LeaveRequest[]> {
    return this.db
      .select()
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.organizationId, organizationId),
          eq(leaveRequests.status, 'approved'),
          lte(leaveRequests.startDate, to),
          gte(leaveRequests.endDate, from),
        ),
      );
  }

  async findAssignedShiftsInRange(
    organizationId: string,
    from: string,
    to: string,
  ): Promise<Shift[]> {
    return this.db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.organizationId, organizationId),
          between(shifts.date, from, to),
          isNotNull(shifts.userId),
        ),
      );
  }

  async findShiftById(id: string, organizationId: string): Promise<Shift | null> {
    const rows = await this.db
      .select()
      .from(shifts)
      .where(and(eq(shifts.id, id), eq(shifts.organizationId, organizationId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Conditionally assigns a still-open shift; returns null if it was claimed meanwhile. */
  async assignShiftIfOpen(shiftId: string, userId: string): Promise<Shift | null> {
    const result = await this.db
      .update(shifts)
      .set({ userId, isOpen: false, updatedAt: new Date() })
      .where(and(eq(shifts.id, shiftId), eq(shifts.isOpen, true), isNull(shifts.userId)))
      .returning();
    return result[0] ?? null;
  }

  async findUsersByIds(ids: string[]): Promise<CandidateUser[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        maxHoursPerWeek: employeeProfiles.maxHoursPerWeek,
      })
      .from(users)
      .leftJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
      .where(inArray(users.id, ids));
    return rows;
  }

  async findPushTokensForUsers(userIds: string[]): Promise<Map<string, string[]>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.db
      .select()
      .from(pushTokens)
      .where(inArray(pushTokens.userId, userIds));
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const arr = map.get(row.userId) ?? [];
      arr.push(row.token);
      map.set(row.userId, arr);
    }
    return map;
  }
}
