import type {
  AssignmentStrategy,
  AvailabilityPreference,
  SchedulingDefaultAvailability,
} from '@hecto/shared-types';

export interface SolverShift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface SolverCandidate {
  userId: string;
  maxHoursPerWeek: number | null;
}

export interface SolverAvailability {
  userId: string;
  dayOfWeek: number;
  preference: AvailabilityPreference;
  timeFrom: string | null;
  timeTo: string | null;
}

export interface SolverLeave {
  userId: string;
  startDate: string;
  endDate: string;
}

export interface SolverExistingShift {
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface SolverSettings {
  maxHoursPerWeek: number;
  minRestHours: number;
  enforceMaxHours: boolean;
  enforceRestRule: boolean;
  defaultAvailability: SchedulingDefaultAvailability;
  assignmentStrategy: AssignmentStrategy;
}

export interface SolverInput {
  shifts: SolverShift[];
  candidates: SolverCandidate[];
  availability: SolverAvailability[];
  approvedLeave: SolverLeave[];
  existingShifts: SolverExistingShift[];
  settings: SolverSettings;
}

export interface SolverAssignment {
  shiftId: string;
  userId: string | null;
  score: number | null;
  reason: string | null;
}

export interface CandidateEvaluation {
  userId: string;
  eligible: boolean;
  reason: string | null;
  preference: AvailabilityPreference;
  weeklyHours: number;
}

const PREFERENCE_SCORE: Record<AvailabilityPreference, number> = {
  preferred: 2,
  available: 1,
  unavailable: 0,
};

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function dateToEpochMinutes(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!) / 60_000;
}

export function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}

export function shiftDurationMinutes(startTime: string, endTime: string): number {
  const diff = toMinutes(endTime) - toMinutes(startTime);
  return diff > 0 ? diff : diff + 24 * 60;
}

interface Interval {
  startAbs: number;
  endAbs: number;
}

function toInterval(date: string, startTime: string, endTime: string): Interval {
  const startAbs = dateToEpochMinutes(date) + toMinutes(startTime);
  return { startAbs, endAbs: startAbs + shiftDurationMinutes(startTime, endTime) };
}

/** Monday-based week key (date string of the Monday) used for weekly-hours buckets. */
export function weekKey(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  const day = dt.getUTCDay();
  dt.setUTCDate(dt.getUTCDate() - day + (day === 0 ? -6 : 1));
  return dt.toISOString().split('T')[0]!;
}

interface UserState {
  intervals: Interval[];
  hoursByWeek: Map<string, number>;
}

function buildUserStates(existingShifts: SolverExistingShift[]): Map<string, UserState> {
  const states = new Map<string, UserState>();
  for (const s of existingShifts) {
    const state: UserState = states.get(s.userId) ?? { intervals: [], hoursByWeek: new Map() };
    state.intervals.push(toInterval(s.date, s.startTime, s.endTime));
    const wk = weekKey(s.date);
    state.hoursByWeek.set(
      wk,
      (state.hoursByWeek.get(wk) ?? 0) + shiftDurationMinutes(s.startTime, s.endTime) / 60,
    );
    states.set(s.userId, state);
  }
  return states;
}

function getPreference(
  availability: SolverAvailability[],
  userId: string,
  dayOfWeek: number,
  defaultAvailability: SchedulingDefaultAvailability,
): { preference: AvailabilityPreference; timeFrom: string | null; timeTo: string | null } {
  const entry = availability.find((a) => a.userId === userId && a.dayOfWeek === dayOfWeek);
  if (!entry) return { preference: defaultAvailability, timeFrom: null, timeTo: null };
  return { preference: entry.preference, timeFrom: entry.timeFrom, timeTo: entry.timeTo };
}

function evaluateCandidate(
  shift: SolverShift,
  candidate: SolverCandidate,
  input: SolverInput,
  state: UserState | undefined,
): CandidateEvaluation {
  const { settings } = input;
  const dayOfWeek = getDayOfWeek(shift.date);
  const wk = weekKey(shift.date);
  const weeklyHours = state?.hoursByWeek.get(wk) ?? 0;
  const { preference, timeFrom, timeTo } = getPreference(
    input.availability,
    candidate.userId,
    dayOfWeek,
    settings.defaultAvailability,
  );

  const base = { userId: candidate.userId, preference, weeklyHours };

  const onLeave = input.approvedLeave.some(
    (l) => l.userId === candidate.userId && l.startDate <= shift.date && l.endDate >= shift.date,
  );
  if (onLeave) return { ...base, eligible: false, reason: 'on approved leave' };

  if (preference === 'unavailable') {
    return { ...base, eligible: false, reason: 'unavailable' };
  }

  if (timeFrom && timeTo) {
    const windowFrom = toMinutes(timeFrom);
    const windowTo = toMinutes(timeTo);
    if (toMinutes(shift.startTime) < windowFrom || toMinutes(shift.endTime) > windowTo) {
      return { ...base, eligible: false, reason: 'outside availability window' };
    }
  }

  const interval = toInterval(shift.date, shift.startTime, shift.endTime);
  const overlaps = state?.intervals.some(
    (i) => i.startAbs < interval.endAbs && interval.startAbs < i.endAbs,
  );
  if (overlaps) return { ...base, eligible: false, reason: 'overlapping shift' };

  if (settings.enforceMaxHours) {
    const cap = candidate.maxHoursPerWeek ?? settings.maxHoursPerWeek;
    const shiftHours = shiftDurationMinutes(shift.startTime, shift.endTime) / 60;
    if (weeklyHours + shiftHours > cap) {
      return { ...base, eligible: false, reason: `would exceed ${cap}h/week` };
    }
  }

  if (settings.enforceRestRule) {
    const minRestMinutes = settings.minRestHours * 60;
    const restViolation = state?.intervals.some((i) => {
      const gapAfter = interval.startAbs - i.endAbs;
      const gapBefore = i.startAbs - interval.endAbs;
      const gap = gapAfter >= 0 ? gapAfter : gapBefore;
      return gap >= 0 && gap < minRestMinutes;
    });
    if (restViolation) {
      return {
        ...base,
        eligible: false,
        reason: `less than ${settings.minRestHours}h rest between shifts`,
      };
    }
  }

  if (settings.assignmentStrategy === 'preference_only' && preference !== 'preferred') {
    return { ...base, eligible: false, reason: 'has not marked this time as preferred' };
  }

  return { ...base, eligible: true, reason: null };
}

function pickBest(
  evaluations: CandidateEvaluation[],
  strategy: AssignmentStrategy,
): CandidateEvaluation | null {
  const eligible = evaluations.filter((e) => e.eligible);
  if (eligible.length === 0) return null;

  const sorted = [...eligible].sort((a, b) => {
    const prefDiff = PREFERENCE_SCORE[b.preference] - PREFERENCE_SCORE[a.preference];
    const hoursDiff = a.weeklyHours - b.weeklyHours;
    if (strategy === 'fairness_first') {
      return hoursDiff !== 0 ? hoursDiff : prefDiff !== 0 ? prefDiff : a.userId.localeCompare(b.userId);
    }
    // preference_first and preference_only: preference score wins, fairness breaks ties
    return prefDiff !== 0 ? prefDiff : hoursDiff !== 0 ? hoursDiff : a.userId.localeCompare(b.userId);
  });
  return sorted[0]!;
}

function summarizeReasons(evaluations: CandidateEvaluation[]): string {
  if (evaluations.length === 0) return 'no employees to schedule';
  const counts = new Map<string, number>();
  for (const e of evaluations) {
    const reason = e.reason ?? 'ineligible';
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  const parts = [...counts.entries()].map(([reason, count]) => `${count} ${reason}`);
  return `no eligible employee: ${parts.join(', ')}`;
}

/**
 * Greedy roster solver. Walks shifts chronologically; for each shift picks the
 * eligible candidate ranked by the org's assignment strategy. Hard constraints:
 * approved leave, availability, overlapping shifts, weekly hour cap, minimum rest.
 */
export function solve(input: SolverInput): SolverAssignment[] {
  const states = buildUserStates(input.existingShifts);

  const shifts = [...input.shifts].sort(
    (a, b) => a.date.localeCompare(b.date) || toMinutes(a.startTime) - toMinutes(b.startTime),
  );

  const assignments: SolverAssignment[] = [];

  for (const shift of shifts) {
    const evaluations = input.candidates.map((c) =>
      evaluateCandidate(shift, c, input, states.get(c.userId)),
    );
    const best = pickBest(evaluations, input.settings.assignmentStrategy);

    if (!best) {
      assignments.push({
        shiftId: shift.id,
        userId: null,
        score: null,
        reason: summarizeReasons(evaluations),
      });
      continue;
    }

    assignments.push({
      shiftId: shift.id,
      userId: best.userId,
      score: PREFERENCE_SCORE[best.preference],
      reason: null,
    });

    const state: UserState = states.get(best.userId) ?? { intervals: [], hoursByWeek: new Map() };
    state.intervals.push(toInterval(shift.date, shift.startTime, shift.endTime));
    const wk = weekKey(shift.date);
    state.hoursByWeek.set(
      wk,
      (state.hoursByWeek.get(wk) ?? 0) + shiftDurationMinutes(shift.startTime, shift.endTime) / 60,
    );
    states.set(best.userId, state);
  }

  return assignments;
}

/**
 * Evaluate every candidate for a single shift — used by the manager's
 * assignment picker to show per-person eligibility.
 */
export function evaluateShiftCandidates(
  shift: SolverShift,
  input: Omit<SolverInput, 'shifts'>,
): CandidateEvaluation[] {
  const states = buildUserStates(input.existingShifts);
  return input.candidates.map((c) =>
    evaluateCandidate(shift, c, { ...input, shifts: [shift] }, states.get(c.userId)),
  );
}
