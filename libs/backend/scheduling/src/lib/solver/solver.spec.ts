import {
  solve,
  evaluateShiftCandidates,
  weekKey,
  shiftDurationMinutes,
  type SolverInput,
  type SolverSettings,
} from './solver';

// 2026-07-20 is a Monday.
const MON = '2026-07-20';
const TUE = '2026-07-21';
const WED = '2026-07-22';

function makeSettings(overrides: Partial<SolverSettings> = {}): SolverSettings {
  return {
    maxHoursPerWeek: 40,
    minRestHours: 11,
    enforceMaxHours: true,
    enforceRestRule: true,
    defaultAvailability: 'available',
    assignmentStrategy: 'preference_first',
    ...overrides,
  };
}

function makeInput(overrides: Partial<SolverInput> = {}): SolverInput {
  return {
    shifts: [],
    candidates: [],
    availability: [],
    approvedLeave: [],
    existingShifts: [],
    settings: makeSettings(),
    ...overrides,
  };
}

const dayShift = (id: string, date: string, startTime = '09:00', endTime = '17:00') => ({
  id,
  date,
  startTime,
  endTime,
});

describe('helpers', () => {
  it('weekKey maps any weekday to its Monday', () => {
    expect(weekKey(MON)).toBe(MON);
    expect(weekKey(WED)).toBe(MON);
    expect(weekKey('2026-07-26')).toBe(MON); // Sunday belongs to the preceding Monday
  });

  it('shiftDurationMinutes handles shifts crossing midnight', () => {
    expect(shiftDurationMinutes('09:00', '17:00')).toBe(480);
    expect(shiftDurationMinutes('22:00', '06:00')).toBe(480);
  });
});

describe('solve — hard constraints', () => {
  it('assigns an available candidate to an open shift', () => {
    const result = solve(
      makeInput({
        shifts: [dayShift('s1', MON)],
        candidates: [{ userId: 'ana', maxHoursPerWeek: null }],
      }),
    );
    expect(result).toEqual([{ shiftId: 's1', userId: 'ana', score: 1, reason: null }]);
  });

  it('never assigns onto approved leave', () => {
    const result = solve(
      makeInput({
        shifts: [dayShift('s1', MON)],
        candidates: [{ userId: 'ana', maxHoursPerWeek: null }],
        approvedLeave: [{ userId: 'ana', startDate: MON, endDate: WED }],
      }),
    );
    expect(result[0]!.userId).toBeNull();
    expect(result[0]!.reason).toContain('on approved leave');
  });

  it('skips candidates marked unavailable for that weekday', () => {
    const result = solve(
      makeInput({
        shifts: [dayShift('s1', MON)],
        candidates: [{ userId: 'ana', maxHoursPerWeek: null }],
        availability: [
          { userId: 'ana', dayOfWeek: 1, preference: 'unavailable', timeFrom: null, timeTo: null },
        ],
      }),
    );
    expect(result[0]!.userId).toBeNull();
  });

  it('treats unset availability using the org default', () => {
    const optIn = solve(
      makeInput({
        shifts: [dayShift('s1', MON)],
        candidates: [{ userId: 'ana', maxHoursPerWeek: null }],
        settings: makeSettings({ defaultAvailability: 'unavailable' }),
      }),
    );
    expect(optIn[0]!.userId).toBeNull();
  });

  it('rejects shifts outside the availability time window', () => {
    const result = solve(
      makeInput({
        shifts: [dayShift('s1', MON, '08:00', '16:00')],
        candidates: [{ userId: 'ana', maxHoursPerWeek: null }],
        availability: [
          { userId: 'ana', dayOfWeek: 1, preference: 'available', timeFrom: '09:00', timeTo: '17:00' },
        ],
      }),
    );
    expect(result[0]!.userId).toBeNull();
    expect(result[0]!.reason).toContain('outside availability window');
  });

  it('never double-books overlapping shifts, including within one run', () => {
    const result = solve(
      makeInput({
        shifts: [dayShift('s1', MON, '09:00', '17:00'), dayShift('s2', MON, '12:00', '20:00')],
        candidates: [{ userId: 'ana', maxHoursPerWeek: null }],
      }),
    );
    const assigned = result.filter((r) => r.userId === 'ana');
    expect(assigned).toHaveLength(1);
  });

  it('respects the weekly hour cap using existing shifts', () => {
    const result = solve(
      makeInput({
        shifts: [dayShift('s1', WED)], // 8h
        candidates: [{ userId: 'ana', maxHoursPerWeek: null }],
        settings: makeSettings({ maxHoursPerWeek: 40 }),
        existingShifts: [
          { userId: 'ana', date: MON, startTime: '00:00', endTime: '18:00' }, // 18h
          { userId: 'ana', date: TUE, startTime: '00:00', endTime: '18:00' }, // 18h → 36h total
        ],
      }),
    );
    expect(result[0]!.userId).toBeNull();
    expect(result[0]!.reason).toContain('exceed');
  });

  it('per-employee hour override beats the org default', () => {
    const result = solve(
      makeInput({
        shifts: [dayShift('s1', MON)], // 8h > 4h cap
        candidates: [{ userId: 'ana', maxHoursPerWeek: 4 }],
      }),
    );
    expect(result[0]!.userId).toBeNull();
  });

  it('skips the hour cap when enforcement is off', () => {
    const result = solve(
      makeInput({
        shifts: [dayShift('s1', MON)],
        candidates: [{ userId: 'ana', maxHoursPerWeek: 4 }],
        settings: makeSettings({ enforceMaxHours: false }),
      }),
    );
    expect(result[0]!.userId).toBe('ana');
  });

  it('enforces minimum rest across adjacent days', () => {
    const result = solve(
      makeInput({
        // Existing shift ends Mon 23:00; new shift starts Tue 06:00 → 7h rest < 11h.
        shifts: [dayShift('s1', TUE, '06:00', '14:00')],
        candidates: [{ userId: 'ana', maxHoursPerWeek: null }],
        existingShifts: [{ userId: 'ana', date: MON, startTime: '15:00', endTime: '23:00' }],
      }),
    );
    expect(result[0]!.userId).toBeNull();
    expect(result[0]!.reason).toContain('rest');
  });

  it('allows the shift when rest is sufficient', () => {
    const result = solve(
      makeInput({
        shifts: [dayShift('s1', TUE, '10:00', '18:00')],
        candidates: [{ userId: 'ana', maxHoursPerWeek: null }],
        existingShifts: [{ userId: 'ana', date: MON, startTime: '15:00', endTime: '23:00' }],
      }),
    );
    expect(result[0]!.userId).toBe('ana');
  });
});

describe('solve — strategy and fairness', () => {
  const twoCandidates = [
    { userId: 'ana', maxHoursPerWeek: null },
    { userId: 'bo', maxHoursPerWeek: null },
  ];

  it('preference_first picks the candidate who prefers the slot', () => {
    const result = solve(
      makeInput({
        shifts: [dayShift('s1', MON)],
        candidates: twoCandidates,
        availability: [
          { userId: 'bo', dayOfWeek: 1, preference: 'preferred', timeFrom: null, timeTo: null },
        ],
      }),
    );
    expect(result[0]!.userId).toBe('bo');
    expect(result[0]!.score).toBe(2);
  });

  it('breaks preference ties by fewest weekly hours', () => {
    const result = solve(
      makeInput({
        shifts: [dayShift('s1', WED)],
        candidates: twoCandidates,
        existingShifts: [{ userId: 'ana', date: MON, startTime: '09:00', endTime: '17:00' }],
      }),
    );
    expect(result[0]!.userId).toBe('bo');
  });

  it('fairness_first lets fewer hours beat preference', () => {
    const result = solve(
      makeInput({
        shifts: [dayShift('s1', WED)],
        candidates: twoCandidates,
        availability: [
          { userId: 'ana', dayOfWeek: 3, preference: 'preferred', timeFrom: null, timeTo: null },
        ],
        existingShifts: [{ userId: 'ana', date: MON, startTime: '09:00', endTime: '17:00' }],
        settings: makeSettings({ assignmentStrategy: 'fairness_first' }),
      }),
    );
    expect(result[0]!.userId).toBe('bo');
  });

  it('preference_only leaves shifts unfilled when nobody prefers them', () => {
    const result = solve(
      makeInput({
        shifts: [dayShift('s1', MON)],
        candidates: twoCandidates,
        settings: makeSettings({ assignmentStrategy: 'preference_only' }),
      }),
    );
    expect(result[0]!.userId).toBeNull();
  });

  it('spreads shifts across the draft as hours accumulate', () => {
    const result = solve(
      makeInput({
        shifts: [dayShift('s1', MON), dayShift('s2', TUE)],
        candidates: twoCandidates,
      }),
    );
    const users = result.map((r) => r.userId);
    expect(new Set(users).size).toBe(2);
  });

  it('is deterministic on full ties (userId order)', () => {
    const result = solve(
      makeInput({ shifts: [dayShift('s1', MON)], candidates: twoCandidates }),
    );
    expect(result[0]!.userId).toBe('ana');
  });
});

describe('solve — unfilled reporting', () => {
  it('summarizes why nobody was eligible', () => {
    const result = solve(
      makeInput({
        shifts: [dayShift('s1', MON)],
        candidates: [
          { userId: 'ana', maxHoursPerWeek: null },
          { userId: 'bo', maxHoursPerWeek: null },
        ],
        approvedLeave: [{ userId: 'ana', startDate: MON, endDate: MON }],
        availability: [
          { userId: 'bo', dayOfWeek: 1, preference: 'unavailable', timeFrom: null, timeTo: null },
        ],
      }),
    );
    expect(result[0]!.reason).toContain('1 on approved leave');
    expect(result[0]!.reason).toContain('1 unavailable');
  });
});

describe('evaluateShiftCandidates', () => {
  it('returns eligibility for every candidate', () => {
    const evaluations = evaluateShiftCandidates(dayShift('s1', MON), {
      candidates: [
        { userId: 'ana', maxHoursPerWeek: null },
        { userId: 'bo', maxHoursPerWeek: null },
      ],
      availability: [
        { userId: 'bo', dayOfWeek: 1, preference: 'unavailable', timeFrom: null, timeTo: null },
      ],
      approvedLeave: [],
      existingShifts: [{ userId: 'ana', date: MON, startTime: '18:00', endTime: '20:00' }],
      settings: makeSettings({ enforceRestRule: false }),
    });

    expect(evaluations).toHaveLength(2);
    const ana = evaluations.find((e) => e.userId === 'ana')!;
    const bo = evaluations.find((e) => e.userId === 'bo')!;
    expect(ana.eligible).toBe(true);
    expect(ana.weeklyHours).toBe(2);
    expect(bo.eligible).toBe(false);
    expect(bo.reason).toBe('unavailable');
  });
});
