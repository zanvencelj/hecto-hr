import type { AccessTokenPayload } from '@hecto/shared-types';
import { LeaveService, countWeekdays } from './leave.service';
import type { LeaveRepository, LeaveRequestWithType } from './leave.repository';

describe('countWeekdays', () => {
  it('counts a single weekday as 1 day', () => {
    // 2026-01-05 is a Monday
    expect(countWeekdays('2026-01-05', '2026-01-05')).toBe(1);
  });

  it('counts a single weekend day as 0 days', () => {
    // 2026-01-03 is a Saturday
    expect(countWeekdays('2026-01-03', '2026-01-03')).toBe(0);
  });

  it('excludes both weekend days from a full week', () => {
    // Mon 2026-01-05 through Sun 2026-01-11
    expect(countWeekdays('2026-01-05', '2026-01-11')).toBe(5);
  });

  it('counts a range spanning a weekend correctly', () => {
    // Fri 2026-01-09 through Mon 2026-01-12 = Fri, Mon (Sat/Sun excluded)
    expect(countWeekdays('2026-01-09', '2026-01-12')).toBe(2);
  });

  it('counts across multiple weeks', () => {
    // Mon 2026-01-05 through Fri 2026-01-16 = 10 weekdays (2 full work weeks)
    expect(countWeekdays('2026-01-05', '2026-01-16')).toBe(10);
  });
});

function makeRepo(overrides: Partial<jest.Mocked<LeaveRepository>> = {}): jest.Mocked<LeaveRepository> {
  return {
    findLeaveTypesByOrg: jest.fn(),
    findSystemLeaveTypes: jest.fn(),
    createLeaveType: jest.fn(),
    findBalancesForEmployee: jest.fn(),
    findAllBalancesForOrg: jest.fn(),
    upsertBalance: jest.fn(),
    adjustUsedDays: jest.fn(),
    createRequest: jest.fn(),
    updateRequest: jest.fn(),
    findRequestById: jest.fn(),
    findRequestsForEmployee: jest.fn(),
    findRequestsForOrg: jest.fn(),
    seedDefaultLeaveTypes: jest.fn(),
    ...overrides,
  } as jest.Mocked<LeaveRepository>;
}

function makeUser(overrides: Partial<AccessTokenPayload> = {}): AccessTokenPayload {
  return {
    sub: 'user-1',
    email: 'employee@hectohr.io',
    organizationId: 'org-1',
    role: 'employee',
    sessionId: 'session-1',
    ...overrides,
  };
}

function makeRequestRow(overrides: Partial<LeaveRequestWithType> = {}): LeaveRequestWithType {
  return {
    id: 'req-1',
    userId: 'user-1',
    organizationId: 'org-1',
    leaveTypeId: 'type-1',
    startDate: '2026-01-05',
    endDate: '2026-01-06',
    totalDays: '2',
    status: 'pending',
    requestedByUserId: 'user-1',
    reviewedByUserId: null,
    reviewedAt: null,
    isManualEntry: false,
    isEdited: false,
    editedAt: null,
    editedByUserId: null,
    notes: null,
    reviewNotes: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    typeName: 'Annual Leave',
    typeCode: 'annual',
    typeColor: '#6366f1',
    employeeName: 'Employee One',
    ...overrides,
  } as LeaveRequestWithType;
}

describe('LeaveService accrual/deduction math', () => {
  describe('createLeaveRequest', () => {
    it('books a normal employee request against pendingDays, not usedDays', async () => {
      const repo = makeRepo({
        createRequest: jest.fn().mockResolvedValue(makeRequestRow()),
      });
      const service = new LeaveService(repo);

      await service.createLeaveRequest(
        {
          userId: 'user-1',
          leaveTypeId: 'type-1',
          startDate: '2026-01-05',
          endDate: '2026-01-06',
        } as never,
        makeUser(),
      );

      // Mon+Tue = 2 weekdays, added to pendingDays, usedDays untouched
      expect(repo.adjustUsedDays).toHaveBeenCalledWith(
        'user-1', 'org-1', 'type-1', 2026, '0', '2',
      );
    });

    it('books a manager manual entry directly against usedDays, not pendingDays', async () => {
      const repo = makeRepo({
        createRequest: jest.fn().mockResolvedValue(makeRequestRow({ isManualEntry: true, status: 'approved' })),
      });
      const service = new LeaveService(repo);

      await service.createLeaveRequest(
        {
          userId: 'user-1',
          leaveTypeId: 'type-1',
          startDate: '2026-01-05',
          endDate: '2026-01-06',
          isManualEntry: true,
        } as never,
        makeUser({ sub: 'manager-1', role: 'manager' }),
      );

      expect(repo.adjustUsedDays).toHaveBeenCalledWith(
        'user-1', 'org-1', 'type-1', 2026, '2', '0',
      );
    });

    it('rejects a zero-length range instead of silently booking 0 days', async () => {
      const repo = makeRepo();
      const service = new LeaveService(repo);

      await expect(
        service.createLeaveRequest(
          { userId: 'user-1', leaveTypeId: 'type-1', startDate: '2026-01-03', endDate: '2026-01-03' } as never,
          makeUser(),
        ),
      ).rejects.toThrow('Invalid date range');
      expect(repo.createRequest).not.toHaveBeenCalled();
    });
  });

  describe('reviewLeaveRequest', () => {
    it('moves days from pendingDays to usedDays on approval', async () => {
      const pendingRequest = makeRequestRow({ status: 'pending', totalDays: '3' });
      const repo = makeRepo({
        findRequestById: jest.fn()
          .mockResolvedValueOnce(pendingRequest)
          .mockResolvedValueOnce({ ...pendingRequest, status: 'approved' }),
        updateRequest: jest.fn().mockResolvedValue({ ...pendingRequest, status: 'approved' }),
      });
      const service = new LeaveService(repo);

      await service.reviewLeaveRequest('req-1', { status: 'approved' } as never, makeUser({ role: 'manager' }));

      expect(repo.adjustUsedDays).toHaveBeenCalledWith(
        'user-1', 'org-1', 'type-1', 2026, '3', '-3',
      );
    });

    it('removes days from pendingDays only on rejection, leaving usedDays untouched', async () => {
      const pendingRequest = makeRequestRow({ status: 'pending', totalDays: '3' });
      const repo = makeRepo({
        findRequestById: jest.fn()
          .mockResolvedValueOnce(pendingRequest)
          .mockResolvedValueOnce({ ...pendingRequest, status: 'rejected' }),
        updateRequest: jest.fn().mockResolvedValue({ ...pendingRequest, status: 'rejected' }),
      });
      const service = new LeaveService(repo);

      await service.reviewLeaveRequest('req-1', { status: 'rejected' } as never, makeUser({ role: 'manager' }));

      expect(repo.adjustUsedDays).toHaveBeenCalledWith(
        'user-1', 'org-1', 'type-1', 2026, '0', '-3',
      );
    });

    it('refuses to re-review a request that is not pending', async () => {
      const repo = makeRepo({
        findRequestById: jest.fn().mockResolvedValue(makeRequestRow({ status: 'approved' })),
      });
      const service = new LeaveService(repo);

      await expect(
        service.reviewLeaveRequest('req-1', { status: 'approved' } as never, makeUser({ role: 'manager' })),
      ).rejects.toThrow('Request is not pending');
      expect(repo.adjustUsedDays).not.toHaveBeenCalled();
    });
  });

  describe('cancelLeaveRequest', () => {
    it('gives back pendingDays when cancelling a pending request', async () => {
      const repo = makeRepo({
        findRequestById: jest.fn().mockResolvedValue(makeRequestRow({ status: 'pending', totalDays: '2' })),
      });
      const service = new LeaveService(repo);

      await service.cancelLeaveRequest('req-1', makeUser());

      expect(repo.adjustUsedDays).toHaveBeenCalledWith(
        'user-1', 'org-1', 'type-1', 2026, '0', '-2',
      );
    });

    it('gives back usedDays when cancelling an already-approved request', async () => {
      const repo = makeRepo({
        findRequestById: jest.fn().mockResolvedValue(makeRequestRow({ status: 'approved', totalDays: '2' })),
      });
      const service = new LeaveService(repo);

      await service.cancelLeaveRequest('req-1', makeUser({ role: 'manager' }));

      expect(repo.adjustUsedDays).toHaveBeenCalledWith(
        'user-1', 'org-1', 'type-1', 2026, '-2', '0',
      );
    });
  });

  describe('editRequestDays', () => {
    it('applies a positive delta to usedDays when editing an approved request upward', async () => {
      const approvedRequest = makeRequestRow({ status: 'approved', totalDays: '2' });
      const repo = makeRepo({
        findRequestById: jest.fn()
          .mockResolvedValueOnce(approvedRequest)
          .mockResolvedValueOnce({ ...approvedRequest, totalDays: '5' }),
      });
      const service = new LeaveService(repo);

      await service.editRequestDays('req-1', 5, makeUser({ role: 'admin' }));

      // delta = 5 - 2 = 3, applied to usedDays since request is already approved
      expect(repo.adjustUsedDays).toHaveBeenCalledWith(
        'user-1', 'org-1', 'type-1', 2026, '3', '0',
      );
    });

    it('applies a negative delta to pendingDays when editing a pending request downward', async () => {
      const pendingRequest = makeRequestRow({ status: 'pending', totalDays: '5' });
      const repo = makeRepo({
        findRequestById: jest.fn()
          .mockResolvedValueOnce(pendingRequest)
          .mockResolvedValueOnce({ ...pendingRequest, totalDays: '2' }),
      });
      const service = new LeaveService(repo);

      await service.editRequestDays('req-1', 2, makeUser({ role: 'admin' }));

      // delta = 2 - 5 = -3, applied to pendingDays since request is still pending
      expect(repo.adjustUsedDays).toHaveBeenCalledWith(
        'user-1', 'org-1', 'type-1', 2026, '0', '-3',
      );
    });

    it('rejects a non-positive totalDays edit', async () => {
      const repo = makeRepo({
        findRequestById: jest.fn().mockResolvedValue(makeRequestRow()),
      });
      const service = new LeaveService(repo);

      await expect(
        service.editRequestDays('req-1', 0, makeUser({ role: 'admin' })),
      ).rejects.toThrow('totalDays must be > 0');
    });
  });
});
