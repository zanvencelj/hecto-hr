import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  AccessTokenPayload,
  PublishResultPublic,
  ScheduleDraftPublic,
  SchedulingSettingsPublic,
  ShiftCandidatePublic,
  StaffingTemplatePublic,
} from '@hecto/shared-types';
import type {
  NewShift,
  SchedulingSettings,
  ScheduleDraft,
  StaffingTemplate,
} from '@hecto/database';
import { TasksQueueService } from '@hecto/queue';
import { SchedulingRepository, type AssignmentWithShift, type DraftWithAssignments } from './scheduling.repository';
import { UpdateSchedulingSettingsDto } from './dto/update-scheduling-settings.dto';
import { CreateStaffingTemplateDto } from './dto/create-staffing-template.dto';
import { UpdateStaffingTemplateDto } from './dto/update-staffing-template.dto';
import { GenerateDraftDto } from './dto/generate-draft.dto';
import { UpdateDraftAssignmentDto } from './dto/update-draft-assignment.dto';
import {
  evaluateShiftCandidates,
  getDayOfWeek,
  solve,
  weekKey,
  type SolverInput,
  type SolverSettings,
} from './solver/solver';

export const MAX_DRAFT_RANGE_DAYS = 35;

export const SETTINGS_DEFAULTS: Omit<SchedulingSettingsPublic, 'organizationId'> = {
  maxHoursPerWeek: 40,
  minRestHours: 11,
  enforceMaxHours: true,
  enforceRestRule: true,
  defaultAvailability: 'available',
  assignmentStrategy: 'preference_first',
  allowClaimingDuringDraft: true,
};

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d! + days));
  return dt.toISOString().split('T')[0]!;
}

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return (Date.UTC(ty!, tm! - 1, td!) - Date.UTC(fy!, fm! - 1, fd!)) / 86_400_000;
}

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    private readonly repo: SchedulingRepository,
    private readonly tasksQueue: TasksQueueService,
  ) {}

  // ── settings ──────────────────────────────────────────────────────────────

  async getSettings(currentUser: AccessTokenPayload): Promise<SchedulingSettingsPublic> {
    const settings = await this.repo.findSettings(currentUser.organizationId);
    return this.toSettingsPublic(currentUser.organizationId, settings);
  }

  async updateSettings(
    dto: UpdateSchedulingSettingsDto,
    currentUser: AccessTokenPayload,
  ): Promise<SchedulingSettingsPublic> {
    const updated = await this.repo.upsertSettings(currentUser.organizationId, {
      maxHoursPerWeek: dto.maxHoursPerWeek,
      minRestHours: dto.minRestHours,
      enforceMaxHours: dto.enforceMaxHours,
      enforceRestRule: dto.enforceRestRule,
      defaultAvailability: dto.defaultAvailability,
      assignmentStrategy: dto.assignmentStrategy,
      allowClaimingDuringDraft: dto.allowClaimingDuringDraft,
    });
    return this.toSettingsPublic(currentUser.organizationId, updated);
  }

  // ── staffing templates ────────────────────────────────────────────────────

  async getTemplates(currentUser: AccessTokenPayload): Promise<StaffingTemplatePublic[]> {
    const templates = await this.repo.findTemplates(currentUser.organizationId);
    return templates.map((t) => this.toTemplatePublic(t));
  }

  async createTemplate(
    dto: CreateStaffingTemplateDto,
    currentUser: AccessTokenPayload,
  ): Promise<StaffingTemplatePublic> {
    if (dto.endDate && dto.endDate < dto.startDate) {
      throw new BadRequestException('endDate must not be before startDate');
    }
    const template = await this.repo.createTemplate({
      organizationId: currentUser.organizationId,
      daysOfWeek: dto.daysOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      headcount: dto.headcount,
      startDate: dto.startDate,
      endDate: dto.endDate ?? null,
      notes: dto.notes ?? null,
      isActive: dto.isActive ?? true,
      createdByUserId: currentUser.sub,
    });
    return this.toTemplatePublic(template);
  }

  async updateTemplate(
    id: string,
    dto: UpdateStaffingTemplateDto,
    currentUser: AccessTokenPayload,
  ): Promise<StaffingTemplatePublic> {
    const existing = await this.repo.findTemplateById(id, currentUser.organizationId);
    if (!existing) throw new NotFoundException('Staffing template not found');

    const updated = await this.repo.updateTemplate(id, {
      daysOfWeek: dto.daysOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      headcount: dto.headcount,
      startDate: dto.startDate,
      endDate: dto.endDate,
      notes: dto.notes,
      isActive: dto.isActive,
    });
    return this.toTemplatePublic(updated);
  }

  async deleteTemplate(id: string, currentUser: AccessTokenPayload): Promise<void> {
    const existing = await this.repo.findTemplateById(id, currentUser.organizationId);
    if (!existing) throw new NotFoundException('Staffing template not found');
    await this.repo.deleteTemplate(id);
  }

  // ── drafts ────────────────────────────────────────────────────────────────

  async getActiveDraft(currentUser: AccessTokenPayload): Promise<ScheduleDraftPublic | null> {
    const draft = await this.repo.findActiveDraft(currentUser.organizationId);
    return draft ? this.toDraftPublic(draft) : null;
  }

  async generateDraft(
    dto: GenerateDraftDto,
    currentUser: AccessTokenPayload,
  ): Promise<ScheduleDraftPublic> {
    if (dto.dateTo < dto.dateFrom) {
      throw new BadRequestException('dateTo must not be before dateFrom');
    }
    if (daysBetween(dto.dateFrom, dto.dateTo) + 1 > MAX_DRAFT_RANGE_DAYS) {
      throw new BadRequestException(
        `Draft range must not exceed ${MAX_DRAFT_RANGE_DAYS} days`,
      );
    }

    const orgId = currentUser.organizationId;

    await this.repo.discardActiveDrafts(orgId);
    await this.materializeTemplates(orgId, dto.dateFrom, dto.dateTo, currentUser.sub);

    const input = await this.buildSolverInput(orgId, dto.dateFrom, dto.dateTo);
    const assignments = solve(input);

    const draft = await this.repo.createDraft({
      organizationId: orgId,
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      createdByUserId: currentUser.sub,
    });

    await this.repo.insertAssignments(
      assignments.map((a) => ({
        draftId: draft.id,
        shiftId: a.shiftId,
        userId: a.userId,
        status: a.userId ? ('proposed' as const) : ('unfilled' as const),
        score: a.score,
        reason: a.reason,
      })),
    );

    const full = await this.repo.findActiveDraft(orgId);
    return this.toDraftPublic(full!);
  }

  async updateAssignment(
    assignmentId: string,
    dto: UpdateDraftAssignmentDto,
    currentUser: AccessTokenPayload,
  ): Promise<ScheduleDraftPublic> {
    const assignment = await this.repo.findAssignmentById(
      assignmentId,
      currentUser.organizationId,
    );
    if (!assignment) throw new NotFoundException('Draft assignment not found');
    if (assignment.draft.status !== 'draft') {
      throw new BadRequestException('Draft is no longer editable');
    }

    if (dto.userId) {
      await this.repo.updateAssignment(assignmentId, {
        userId: dto.userId,
        status: 'manual',
        score: null,
        reason: null,
      });
    } else {
      await this.repo.updateAssignment(assignmentId, {
        userId: null,
        status: 'unfilled',
        score: null,
        reason: 'manually unassigned',
      });
    }

    const full = await this.repo.findActiveDraft(currentUser.organizationId);
    return this.toDraftPublic(full!);
  }

  async approveDraft(currentUser: AccessTokenPayload): Promise<PublishResultPublic> {
    const orgId = currentUser.organizationId;
    const draft = await this.repo.findActiveDraft(orgId);
    if (!draft) throw new NotFoundException('No active schedule draft');

    // Re-validate against fresh data: leave may have been approved and shifts
    // claimed since the draft was generated.
    const freshLeave = await this.repo.findApprovedLeaveOverlapping(
      orgId,
      draft.dateFrom,
      draft.dateTo,
    );

    let published = 0;
    const dropped: PublishResultPublic['dropped'] = [];
    const publishedByUser = new Map<string, number>();

    for (const assignment of draft.assignments) {
      if (!assignment.userId) continue;
      if (assignment.status !== 'proposed' && assignment.status !== 'manual') continue;

      const shift = assignment.shift;
      const onLeave = freshLeave.some(
        (l) =>
          l.userId === assignment.userId &&
          l.startDate <= shift.date &&
          l.endDate >= shift.date,
      );
      if (onLeave) {
        await this.repo.updateAssignment(assignment.id, {
          status: 'stale',
          reason: 'approved leave was added after the draft was generated',
        });
        dropped.push(this.toDropped(assignment, 'employee is now on approved leave'));
        continue;
      }

      const updated = await this.repo.assignShiftIfOpen(shift.id, assignment.userId);
      if (!updated) {
        await this.repo.updateAssignment(assignment.id, {
          status: 'stale',
          reason: 'shift was claimed or assigned after the draft was generated',
        });
        dropped.push(this.toDropped(assignment, 'shift was already claimed'));
        continue;
      }

      published++;
      publishedByUser.set(
        assignment.userId,
        (publishedByUser.get(assignment.userId) ?? 0) + 1,
      );
    }

    await this.repo.markDraftPublished(draft.id);
    await this.notifyPublished(draft, publishedByUser);

    return { published, dropped };
  }

  async discardDraft(currentUser: AccessTokenPayload): Promise<void> {
    const draft = await this.repo.findActiveDraft(currentUser.organizationId);
    if (!draft) throw new NotFoundException('No active schedule draft');
    await this.repo.discardActiveDrafts(currentUser.organizationId);
  }

  async getShiftCandidates(
    shiftId: string,
    currentUser: AccessTokenPayload,
  ): Promise<ShiftCandidatePublic[]> {
    const orgId = currentUser.organizationId;
    const shift = await this.repo.findShiftById(shiftId, orgId);
    if (!shift) throw new NotFoundException('Shift not found');

    const input = await this.buildSolverInput(orgId, shift.date, shift.date);
    const evaluations = evaluateShiftCandidates(
      { id: shift.id, date: shift.date, startTime: shift.startTime, endTime: shift.endTime },
      input,
    );
    return evaluations.map((e) => ({
      userId: e.userId,
      eligible: e.eligible,
      reason: e.reason,
      preference: e.preference,
      weeklyHours: Math.round(e.weeklyHours * 10) / 10,
    }));
  }

  // ── internals ─────────────────────────────────────────────────────────────

  private async materializeTemplates(
    orgId: string,
    from: string,
    to: string,
    createdByUserId: string,
  ): Promise<void> {
    const templates = await this.repo.findActiveTemplates(orgId);

    for (const template of templates) {
      const rangeFrom = template.startDate > from ? template.startDate : from;
      const rangeTo = template.endDate && template.endDate < to ? template.endDate : to;
      if (rangeFrom > rangeTo) continue;

      const existingCounts = await this.repo.countTemplateShiftsForDates(
        template.id,
        rangeFrom,
        rangeTo,
      );

      const newShifts: NewShift[] = [];
      for (let d = rangeFrom; d <= rangeTo; d = addDays(d, 1)) {
        if (!template.daysOfWeek.includes(getDayOfWeek(d))) continue;
        const missing = template.headcount - (existingCounts.get(d) ?? 0);
        for (let i = 0; i < missing; i++) {
          newShifts.push({
            userId: null,
            organizationId: orgId,
            date: d,
            startTime: template.startTime,
            endTime: template.endTime,
            isOpen: true,
            notes: template.notes,
            staffingTemplateId: template.id,
            createdByUserId,
          });
        }
      }
      await this.repo.bulkCreateShifts(newShifts);
    }
  }

  private async buildSolverInput(
    orgId: string,
    from: string,
    to: string,
  ): Promise<SolverInput> {
    // Fetch assigned shifts across the full weeks containing the range (for the
    // weekly-hours cap), padded a day on each side (for the rest rule).
    const fetchFrom = addDays(weekKey(from), -1);
    const fetchTo = addDays(addDays(weekKey(to), 6), 1);

    const [openShifts, candidates, availability, leave, assigned, settings] = await Promise.all([
      this.repo.findOpenShiftsInRange(orgId, from, to),
      this.repo.findCandidates(orgId),
      this.repo.findAvailabilityForOrg(orgId),
      this.repo.findApprovedLeaveOverlapping(orgId, from, to),
      this.repo.findAssignedShiftsInRange(orgId, fetchFrom, fetchTo),
      this.repo.findSettings(orgId),
    ]);

    return {
      shifts: openShifts.map((s) => ({
        id: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      candidates: candidates.map((c) => ({
        userId: c.id,
        maxHoursPerWeek: c.maxHoursPerWeek,
      })),
      availability: availability.map((a) => ({
        userId: a.userId,
        dayOfWeek: a.dayOfWeek,
        preference: a.preference,
        timeFrom: a.timeFrom,
        timeTo: a.timeTo,
      })),
      approvedLeave: leave.map((l) => ({
        userId: l.userId,
        startDate: l.startDate,
        endDate: l.endDate,
      })),
      existingShifts: assigned.map((s) => ({
        userId: s.userId!,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      settings: this.toSolverSettings(settings),
    };
  }

  private toSolverSettings(settings: SchedulingSettings | null): SolverSettings {
    return {
      maxHoursPerWeek: settings?.maxHoursPerWeek ?? SETTINGS_DEFAULTS.maxHoursPerWeek,
      minRestHours: settings?.minRestHours ?? SETTINGS_DEFAULTS.minRestHours,
      enforceMaxHours: settings?.enforceMaxHours ?? SETTINGS_DEFAULTS.enforceMaxHours,
      enforceRestRule: settings?.enforceRestRule ?? SETTINGS_DEFAULTS.enforceRestRule,
      defaultAvailability:
        settings?.defaultAvailability ?? SETTINGS_DEFAULTS.defaultAvailability,
      assignmentStrategy:
        settings?.assignmentStrategy ?? SETTINGS_DEFAULTS.assignmentStrategy,
    };
  }

  private async notifyPublished(
    draft: ScheduleDraft,
    publishedByUser: Map<string, number>,
  ): Promise<void> {
    if (publishedByUser.size === 0) return;
    try {
      const userIds = [...publishedByUser.keys()];
      const [usersById, tokensByUser] = await Promise.all([
        this.repo.findUsersByIds(userIds),
        this.repo.findPushTokensForUsers(userIds),
      ]);

      for (const user of usersById) {
        await this.tasksQueue.sendSchedulePublished({
          email: user.email,
          firstName: user.firstName,
          pushTokens: tokensByUser.get(user.id) ?? [],
          shiftCount: publishedByUser.get(user.id) ?? 0,
          dateFrom: draft.dateFrom,
          dateTo: draft.dateTo,
        });
      }
    } catch (err) {
      // Notification failure must never roll back a published roster.
      this.logger.error(`Failed to enqueue schedule notifications: ${(err as Error).message}`);
    }
  }

  private toSettingsPublic(
    organizationId: string,
    settings: SchedulingSettings | null,
  ): SchedulingSettingsPublic {
    return {
      organizationId,
      maxHoursPerWeek: settings?.maxHoursPerWeek ?? SETTINGS_DEFAULTS.maxHoursPerWeek,
      minRestHours: settings?.minRestHours ?? SETTINGS_DEFAULTS.minRestHours,
      enforceMaxHours: settings?.enforceMaxHours ?? SETTINGS_DEFAULTS.enforceMaxHours,
      enforceRestRule: settings?.enforceRestRule ?? SETTINGS_DEFAULTS.enforceRestRule,
      defaultAvailability:
        settings?.defaultAvailability ?? SETTINGS_DEFAULTS.defaultAvailability,
      assignmentStrategy:
        settings?.assignmentStrategy ?? SETTINGS_DEFAULTS.assignmentStrategy,
      allowClaimingDuringDraft:
        settings?.allowClaimingDuringDraft ?? SETTINGS_DEFAULTS.allowClaimingDuringDraft,
    };
  }

  private toTemplatePublic(template: StaffingTemplate): StaffingTemplatePublic {
    return {
      id: template.id,
      organizationId: template.organizationId,
      daysOfWeek: template.daysOfWeek,
      startTime: template.startTime,
      endTime: template.endTime,
      headcount: template.headcount,
      startDate: template.startDate,
      endDate: template.endDate ?? null,
      notes: template.notes ?? null,
      isActive: template.isActive,
      createdAt: template.createdAt.toISOString(),
    };
  }

  private toDraftPublic(draft: DraftWithAssignments): ScheduleDraftPublic {
    return {
      id: draft.id,
      organizationId: draft.organizationId,
      dateFrom: draft.dateFrom,
      dateTo: draft.dateTo,
      status: draft.status,
      publishedAt: draft.publishedAt?.toISOString() ?? null,
      createdAt: draft.createdAt.toISOString(),
      assignments: draft.assignments
        .sort(
          (a, b) =>
            a.shift.date.localeCompare(b.shift.date) ||
            a.shift.startTime.localeCompare(b.shift.startTime),
        )
        .map((a) => ({
          id: a.id,
          draftId: a.draftId,
          shiftId: a.shiftId,
          userId: a.userId,
          status: a.status,
          score: a.score,
          reason: a.reason,
          shift: {
            id: a.shift.id,
            date: a.shift.date,
            startTime: a.shift.startTime,
            endTime: a.shift.endTime,
            notes: a.shift.notes ?? null,
          },
        })),
    };
  }

  private toDropped(
    assignment: AssignmentWithShift,
    reason: string,
  ): PublishResultPublic['dropped'][number] {
    return {
      shiftId: assignment.shiftId,
      date: assignment.shift.date,
      startTime: assignment.shift.startTime,
      endTime: assignment.shift.endTime,
      reason,
    };
  }
}
