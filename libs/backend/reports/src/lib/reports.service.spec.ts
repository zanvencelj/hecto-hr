import { timeToMinutes, shiftDurationMinutes, computeWorkedMinutes } from './reports.service';

describe('timeToMinutes', () => {
  it('converts HH:MM to minutes since midnight', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  it('falls back to 0 for malformed input', () => {
    expect(timeToMinutes('')).toBe(0);
    expect(timeToMinutes('garbage')).toBe(0);
  });
});

describe('shiftDurationMinutes', () => {
  it('computes a normal same-day shift', () => {
    expect(shiftDurationMinutes('09:00', '17:00')).toBe(480);
  });

  it('wraps past midnight for an overnight shift', () => {
    // 22:00 -> 06:00 next day = 8 hours, not a negative duration
    expect(shiftDurationMinutes('22:00', '06:00')).toBe(480);
  });

  it('returns 0 for a zero-length shift', () => {
    expect(shiftDurationMinutes('09:00', '09:00')).toBe(0);
  });
});

function ev(type: string, isoTime: string): { type: string; occurredAt: Date } {
  return { type, occurredAt: new Date(isoTime) };
}

describe('computeWorkedMinutes', () => {
  it('computes a simple arrival -> departure day', () => {
    const minutes = computeWorkedMinutes([
      ev('arrival', '2026-01-05T09:00:00Z'),
      ev('departure', '2026-01-05T17:00:00Z'),
    ]);
    expect(minutes).toBe(480);
  });

  it('excludes a lunch break from worked time', () => {
    const minutes = computeWorkedMinutes([
      ev('arrival', '2026-01-05T09:00:00Z'),
      ev('break_start', '2026-01-05T12:00:00Z'),
      ev('break_end', '2026-01-05T13:00:00Z'),
      ev('departure', '2026-01-05T17:00:00Z'),
    ]);
    // 3h morning + 4h afternoon = 7h, 1h lunch excluded
    expect(minutes).toBe(420);
  });

  it('treats remote_arrival and business_trip_start the same as arrival', () => {
    expect(
      computeWorkedMinutes([
        ev('remote_arrival', '2026-01-05T09:00:00Z'),
        ev('departure', '2026-01-05T12:00:00Z'),
      ]),
    ).toBe(180);

    expect(
      computeWorkedMinutes([
        ev('business_trip_start', '2026-01-05T09:00:00Z'),
        ev('business_trip_end', '2026-01-05T12:00:00Z'),
      ]),
    ).toBe(180);
  });

  it('sorts out-of-order events before computing duration', () => {
    const minutes = computeWorkedMinutes([
      ev('departure', '2026-01-05T17:00:00Z'),
      ev('arrival', '2026-01-05T09:00:00Z'),
    ]);
    expect(minutes).toBe(480);
  });

  it('ignores a dangling departure with no matching arrival', () => {
    const minutes = computeWorkedMinutes([ev('departure', '2026-01-05T17:00:00Z')]);
    expect(minutes).toBe(0);
  });

  it('does not double count if arrival appears twice without a departure between', () => {
    // second arrival resets workStart to the later time, discarding the first open segment
    const minutes = computeWorkedMinutes([
      ev('arrival', '2026-01-05T09:00:00Z'),
      ev('arrival', '2026-01-05T10:00:00Z'),
      ev('departure', '2026-01-05T11:00:00Z'),
    ]);
    expect(minutes).toBe(60);
  });

  it('sums multiple separate work segments in one day', () => {
    // morning session + afternoon session with an untracked gap between (no break event)
    const minutes = computeWorkedMinutes([
      ev('arrival', '2026-01-05T09:00:00Z'),
      ev('departure', '2026-01-05T12:00:00Z'),
      ev('arrival', '2026-01-05T13:00:00Z'),
      ev('departure', '2026-01-05T17:00:00Z'),
    ]);
    expect(minutes).toBe(3 * 60 + 4 * 60);
  });

  it('returns 0 for an empty event list', () => {
    expect(computeWorkedMinutes([])).toBe(0);
  });
});
