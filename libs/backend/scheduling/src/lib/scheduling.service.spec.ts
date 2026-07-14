import type { AccessTokenPayload } from '@hecto/shared-types';
import { SchedulingService } from './scheduling.service';
import type { SchedulingRepository, DraftWithAssignments } from './scheduling.repository';
import type { TasksQueueService } from '@hecto/queue';

// 2026-07-20 is a Monday.
const MON = '2026-07-20';
const SUN = '2026-07-26';

function makeRepo(
  overrides: Partial<jest.Mocked<SchedulingRepository>> = {},
): jest.Mocked<SchedulingRepository> {
  return {
    findSettings: jest.fn().mockResolvedValue(null),
    upsertSettings: jest.fn(),
    findTemplates: jest.fn().mockResolvedValue([]),
    findTemplateById: jest.fn(),
    createTemplate: jest.fn(),
    updateTemplate: jest.fn(),
    deleteTemplate: jest.fn(),
    findActiveTemplates: jest.fn().mockResolvedValue([]),
    countTemplateShiftsForDates: jest.fn().mockResolvedValue(new Map()),
    bulkCreateShifts: jest.fn().mockResolvedValue(undefined),
    findActiveDraft: jest.fn().mockResolvedValue(null),
    discardActiveDrafts: jest.fn().mockResolvedValue(undefined),
    createDraft: jest.fn(),
    insertAssignments: jest.fn().mockResolvedValue(undefined),
    findAssignmentById: jest.fn(),
    updateAssignment: jest.fn(),
    markDraftPublished: jest.fn().mockResolvedValue(undefined),
    findOpenShiftsInRange: jest.fn().mockResolvedValue([]),
    findCandidates: jest.fn().mockResolvedValue([]),
    findAvailabilityForOrg: jest.fn().mockResolvedValue([]),
    findApprovedLeaveOverlapping: jest.fn().mockResolvedValue([]),
    findAssignedShiftsInRange: jest.fn().mockResolvedValue([]),
    findShiftById: jest.fn(),
    assignShiftIfOpen: jest.fn(),
    findUsersByIds: jest.fn().mockResolvedValue([]),
    findPushTokensForUsers: jest.fn().mockResolvedValue(new Map()),
    ...overrides,
  } as unknown as jest.Mocked<SchedulingRepository>;
}

function makeQueue(): jest.Mocked<TasksQueueService> {
  return {
    sendSchedulePublished: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<TasksQueueService>;
}

function makeUser(overrides: Partial<AccessTokenPayload> = {}): AccessTokenPayload {
  return {
    sub: 'manager-1',
    email: 'manager@hectohr.io',
    organizationId: 'org-1',
    role: 'manager',
    sessionId: 'session-1',
    ...overrides,
  };
}

function makeShift(id: string, date: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    userId: null,
    organizationId: 'org-1',
    date,
    startTime: '09:00',
    endTime: '17:00',
    isOpen: true,
    notes: null,
    recurringShiftId: null,
    staffingTemplateId: null,
    createdByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeDraft(
  assignments: Partial<DraftWithAssignments['assignments'][number]>[],
): DraftWithAssignments {
  return {
    id: 'draft-1',
    organizationId: 'org-1',
    dateFrom: MON,
    dateTo: SUN,
    status: 'draft',
    createdByUserId: 'manager-1',
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    assignments: assignments.map((a, i) => ({
      id: `a-${i}`,
      draftId: 'draft-1',
      shiftId: `s-${i}`,
      userId: null,
      status: 'proposed' as const,
      score: 1,
      reason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      shift: makeShift(`s-${i}`, MON),
      ...a,
    })),
  };
}

describe('generateDraft', () => {
  it('rejects an inverted date range', async () => {
    const service = new SchedulingService(makeRepo(), makeQueue());
    await expect(
      service.generateDraft({ dateFrom: SUN, dateTo: MON }, makeUser()),
    ).rejects.toThrow('dateTo must not be before dateFrom');
  });

  it('rejects ranges longer than 35 days', async () => {
    const service = new SchedulingService(makeRepo(), makeQueue());
    await expect(
      service.generateDraft({ dateFrom: MON, dateTo: '2026-08-31' }, makeUser()),
    ).rejects.toThrow('35 days');
  });

  it('replaces any existing active draft', async () => {
    const repo = makeRepo({
      createDraft: jest.fn().mockResolvedValue(makeDraft([])),
      findActiveDraft: jest.fn().mockResolvedValue(makeDraft([])),
    });
    const service = new SchedulingService(repo, makeQueue());
    await service.generateDraft({ dateFrom: MON, dateTo: SUN }, makeUser());
    expect(repo.discardActiveDrafts).toHaveBeenCalledWith('org-1');
    expect(repo.createDraft).toHaveBeenCalled();
  });

  it('materializes missing open shifts from active templates', async () => {
    const template = {
      id: 'tpl-1',
      organizationId: 'org-1',
      daysOfWeek: [1], // Mondays
      startTime: '09:00',
      endTime: '17:00',
      headcount: 2,
      startDate: '2026-01-01',
      endDate: null,
      notes: null,
      isActive: true,
      createdByUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const repo = makeRepo({
      findActiveTemplates: jest.fn().mockResolvedValue([template]),
      // One shift already materialized for that Monday → only one more needed.
      countTemplateShiftsForDates: jest.fn().mockResolvedValue(new Map([[MON, 1]])),
      createDraft: jest.fn().mockResolvedValue(makeDraft([])),
      findActiveDraft: jest.fn().mockResolvedValue(makeDraft([])),
    });
    const service = new SchedulingService(repo, makeQueue());
    await service.generateDraft({ dateFrom: MON, dateTo: SUN }, makeUser());

    expect(repo.bulkCreateShifts).toHaveBeenCalledTimes(1);
    const created = repo.bulkCreateShifts.mock.calls[0]![0]!;
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      date: MON,
      isOpen: true,
      staffingTemplateId: 'tpl-1',
      userId: null,
    });
  });

  it('stores solver output, marking unassignable shifts unfilled', async () => {
    const repo = makeRepo({
      findOpenShiftsInRange: jest
        .fn()
        .mockResolvedValue([makeShift('s-1', MON), makeShift('s-2', MON)]),
      findCandidates: jest
        .fn()
        .mockResolvedValue([
          { id: 'ana', email: 'ana@x.io', firstName: 'Ana', lastName: null, maxHoursPerWeek: null },
        ]),
      createDraft: jest.fn().mockResolvedValue(makeDraft([])),
      findActiveDraft: jest.fn().mockResolvedValue(makeDraft([])),
    });
    const service = new SchedulingService(repo, makeQueue());
    await service.generateDraft({ dateFrom: MON, dateTo: SUN }, makeUser());

    const inserted = repo.insertAssignments.mock.calls[0]![0]!;
    expect(inserted).toHaveLength(2);
    const statuses = inserted.map((a) => a.status).sort();
    // Ana can only take one of the two overlapping Monday shifts.
    expect(statuses).toEqual(['proposed', 'unfilled']);
  });
});

describe('updateAssignment', () => {
  it('marks a manual assignee', async () => {
    const draft = makeDraft([{ userId: 'ana' }]);
    const repo = makeRepo({
      findAssignmentById: jest
        .fn()
        .mockResolvedValue({ ...draft.assignments[0]!, draft, shift: draft.assignments[0]!.shift }),
      findActiveDraft: jest.fn().mockResolvedValue(draft),
    });
    const service = new SchedulingService(repo, makeQueue());
    await service.updateAssignment('a-0', { userId: 'bo' }, makeUser());
    expect(repo.updateAssignment).toHaveBeenCalledWith('a-0', {
      userId: 'bo',
      status: 'manual',
      score: null,
      reason: null,
    });
  });

  it('unassigns back to unfilled', async () => {
    const draft = makeDraft([{ userId: 'ana' }]);
    const repo = makeRepo({
      findAssignmentById: jest
        .fn()
        .mockResolvedValue({ ...draft.assignments[0]!, draft, shift: draft.assignments[0]!.shift }),
      findActiveDraft: jest.fn().mockResolvedValue(draft),
    });
    const service = new SchedulingService(repo, makeQueue());
    await service.updateAssignment('a-0', { userId: null }, makeUser());
    expect(repo.updateAssignment).toHaveBeenCalledWith('a-0', {
      userId: null,
      status: 'unfilled',
      score: null,
      reason: 'manually unassigned',
    });
  });

  it('refuses edits on a published draft', async () => {
    const draft = { ...makeDraft([{ userId: 'ana' }]), status: 'published' as const };
    const repo = makeRepo({
      findAssignmentById: jest
        .fn()
        .mockResolvedValue({ ...draft.assignments[0]!, draft, shift: draft.assignments[0]!.shift }),
    });
    const service = new SchedulingService(repo, makeQueue());
    await expect(service.updateAssignment('a-0', { userId: 'bo' }, makeUser())).rejects.toThrow(
      'no longer editable',
    );
  });
});

describe('approveDraft', () => {
  it('publishes assignments and notifies each employee once', async () => {
    const draft = makeDraft([
      { userId: 'ana', shiftId: 's-0' },
      { userId: 'ana', shiftId: 's-1', shift: makeShift('s-1', '2026-07-21') },
      { userId: null, status: 'unfilled' },
    ]);
    const repo = makeRepo({
      findActiveDraft: jest.fn().mockResolvedValue(draft),
      assignShiftIfOpen: jest.fn().mockResolvedValue(makeShift('any', MON)),
      findUsersByIds: jest
        .fn()
        .mockResolvedValue([
          { id: 'ana', email: 'ana@x.io', firstName: 'Ana', lastName: null, maxHoursPerWeek: null },
        ]),
    });
    const queue = makeQueue();
    const service = new SchedulingService(repo, queue);

    const result = await service.approveDraft(makeUser());

    expect(result.published).toBe(2);
    expect(result.dropped).toHaveLength(0);
    expect(repo.markDraftPublished).toHaveBeenCalledWith('draft-1');
    expect(queue.sendSchedulePublished).toHaveBeenCalledTimes(1);
    expect(queue.sendSchedulePublished).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ana@x.io', shiftCount: 2 }),
    );
  });

  it('drops assignments whose shift was claimed meanwhile', async () => {
    const draft = makeDraft([{ userId: 'ana', shiftId: 's-0' }]);
    const repo = makeRepo({
      findActiveDraft: jest.fn().mockResolvedValue(draft),
      assignShiftIfOpen: jest.fn().mockResolvedValue(null),
    });
    const service = new SchedulingService(repo, makeQueue());

    const result = await service.approveDraft(makeUser());

    expect(result.published).toBe(0);
    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0]!.reason).toContain('claimed');
    expect(repo.updateAssignment).toHaveBeenCalledWith(
      'a-0',
      expect.objectContaining({ status: 'stale' }),
    );
  });

  it('drops assignments invalidated by newly approved leave', async () => {
    const draft = makeDraft([{ userId: 'ana', shiftId: 's-0' }]);
    const repo = makeRepo({
      findActiveDraft: jest.fn().mockResolvedValue(draft),
      findApprovedLeaveOverlapping: jest
        .fn()
        .mockResolvedValue([
          { userId: 'ana', startDate: MON, endDate: SUN, organizationId: 'org-1' },
        ]),
    });
    const service = new SchedulingService(repo, makeQueue());

    const result = await service.approveDraft(makeUser());

    expect(result.published).toBe(0);
    expect(result.dropped[0]!.reason).toContain('leave');
    expect(repo.assignShiftIfOpen).not.toHaveBeenCalled();
  });

  it('publishes even when notification enqueueing fails', async () => {
    const draft = makeDraft([{ userId: 'ana', shiftId: 's-0' }]);
    const repo = makeRepo({
      findActiveDraft: jest.fn().mockResolvedValue(draft),
      assignShiftIfOpen: jest.fn().mockResolvedValue(makeShift('s-0', MON)),
      findUsersByIds: jest.fn().mockRejectedValue(new Error('db down')),
    });
    const service = new SchedulingService(repo, makeQueue());

    const result = await service.approveDraft(makeUser());
    expect(result.published).toBe(1);
    expect(repo.markDraftPublished).toHaveBeenCalled();
  });

  it('404s without an active draft', async () => {
    const service = new SchedulingService(makeRepo(), makeQueue());
    await expect(service.approveDraft(makeUser())).rejects.toThrow('No active schedule draft');
  });
});

describe('settings', () => {
  it('returns system defaults when the org never configured scheduling', async () => {
    const service = new SchedulingService(makeRepo(), makeQueue());
    const settings = await service.getSettings(makeUser());
    expect(settings).toMatchObject({
      maxHoursPerWeek: 40,
      minRestHours: 11,
      enforceMaxHours: true,
      enforceRestRule: true,
      defaultAvailability: 'available',
      assignmentStrategy: 'preference_first',
      allowClaimingDuringDraft: true,
    });
  });
});
