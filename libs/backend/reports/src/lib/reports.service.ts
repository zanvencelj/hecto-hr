import { Inject, Injectable } from '@nestjs/common';
import { and, between, eq, gte, lte } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type Database,
  shifts,
  workEvents,
  leaveRequests,
  leaveTypes,
} from '@hecto/database';
import type { DaySummary, MonthlySummary, YearlySummary, DayState } from '@hecto/shared-types';

export function timeToMinutes(time: string): number {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr ?? '0', 10);
  const m = parseInt(mStr ?? '0', 10);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

export function shiftDurationMinutes(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const mins = end - start;
  return mins < 0 ? mins + 24 * 60 : mins;
}

export function computeWorkedMinutes(events: { type: string; occurredAt: Date }[]): number {
  const sorted = [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  let workedMs = 0;
  let workStart: Date | null = null;
  let inBreak = false;

  for (const ev of sorted) {
    const t = ev.occurredAt;
    if (ev.type === 'arrival' || ev.type === 'remote_arrival' || ev.type === 'business_trip_start') {
      workStart = t;
      inBreak = false;
    } else if (ev.type === 'break_start') {
      if (workStart) {
        workedMs += t.getTime() - workStart.getTime();
        workStart = null;
      }
      inBreak = true;
    } else if (ev.type === 'break_end') {
      if (inBreak) {
        workStart = t;
        inBreak = false;
      }
    } else if (ev.type === 'departure' || ev.type === 'business_trip_end') {
      if (workStart) {
        workedMs += t.getTime() - workStart.getTime();
        workStart = null;
      }
      inBreak = false;
    }
  }

  return Math.round(workedMs / 60000);
}

function iterateDays(from: string, to: string): string[] {
  const days: string[] = [];
  const cur = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  while (cur <= end) {
    days.push(cur.toISOString().split('T')[0]!);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00Z').getUTCDay();
}

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 0));
  return d.toISOString().split('T')[0]!;
}

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async getYearlySummary(
    userId: string,
    organizationId: string,
    year: number,
    clientDate: string,
  ): Promise<YearlySummary> {
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    const daySummaries = await this.buildDaySummaries(userId, organizationId, from, to, clientDate);

    const months: MonthlySummary[] = [];
    for (let m = 1; m <= 12; m++) {
      const monthDays = daySummaries.filter((d) => {
        const dayMonth = parseInt(d.date.split('-')[1]!, 10);
        return dayMonth === m;
      });
      months.push({
        year,
        month: m,
        totalWorkedMinutes: monthDays.reduce((s, d) => s + d.workedMinutes, 0),
        totalScheduledMinutes: monthDays.reduce((s, d) => s + d.scheduledMinutes, 0),
        totalOvertimeMinutes: monthDays.reduce((s, d) => s + d.overtimeMinutes, 0),
        days: monthDays,
      });
    }

    return {
      year,
      totalWorkedMinutes: daySummaries.reduce((s, d) => s + d.workedMinutes, 0),
      totalScheduledMinutes: daySummaries.reduce((s, d) => s + d.scheduledMinutes, 0),
      totalOvertimeMinutes: daySummaries.reduce((s, d) => s + d.overtimeMinutes, 0),
      months,
    };
  }

  async getMonthlySummary(
    userId: string,
    organizationId: string,
    year: number,
    month: number,
    clientDate: string,
  ): Promise<MonthlySummary> {
    const mm = String(month).padStart(2, '0');
    const from = `${year}-${mm}-01`;
    const to = lastDayOfMonth(year, month);
    const days = await this.buildDaySummaries(userId, organizationId, from, to, clientDate);

    return {
      year,
      month,
      totalWorkedMinutes: days.reduce((s, d) => s + d.workedMinutes, 0),
      totalScheduledMinutes: days.reduce((s, d) => s + d.scheduledMinutes, 0),
      totalOvertimeMinutes: days.reduce((s, d) => s + d.overtimeMinutes, 0),
      days,
    };
  }

  private async buildDaySummaries(
    userId: string,
    organizationId: string,
    from: string,
    to: string,
    today: string,
  ): Promise<DaySummary[]> {
    const [userShifts, userEvents, userLeave] = await Promise.all([
      this.db
        .select()
        .from(shifts)
        .where(
          and(
            eq(shifts.userId, userId),
            eq(shifts.organizationId, organizationId),
            between(shifts.date, from, to),
          ),
        ),
      this.db
        .select()
        .from(workEvents)
        .where(
          and(
            eq(workEvents.userId, userId),
            eq(workEvents.organizationId, organizationId),
            gte(workEvents.occurredAt, new Date(from + 'T00:00:00Z')),
            lte(workEvents.occurredAt, new Date(to + 'T23:59:59.999Z')),
          ),
        ),
      this.db
        .select({ request: leaveRequests, typeName: leaveTypes.name })
        .from(leaveRequests)
        .leftJoin(leaveTypes, eq(leaveTypes.id, leaveRequests.leaveTypeId))
        .where(
          and(
            eq(leaveRequests.userId, userId),
            eq(leaveRequests.organizationId, organizationId),
            eq(leaveRequests.status, 'approved'),
            lte(leaveRequests.startDate, to),
            gte(leaveRequests.endDate, from),
          ),
        ),
    ]);

    const shiftsByDate = new Map(userShifts.map((s) => [s.date, s]));

    const eventsByDate = new Map<string, typeof userEvents>();
    for (const ev of userEvents) {
      const day = ev.occurredAt.toISOString().split('T')[0]!;
      const arr = eventsByDate.get(day) ?? [];
      arr.push(ev);
      eventsByDate.set(day, arr);
    }

    const allDays = iterateDays(from, to);
    return allDays.map((dateStr) => {
      const dow = getDayOfWeek(dateStr);
      const isWeekend = dow === 0 || dow === 6;
      const shift = shiftsByDate.get(dateStr);
      const events = eventsByDate.get(dateStr) ?? [];
      const leave = userLeave.find(
        (l) => l.request.startDate <= dateStr && l.request.endDate >= dateStr,
      );

      const scheduledMinutes = shift ? shiftDurationMinutes(shift.startTime, shift.endTime) : 0;
      const workedMinutes = computeWorkedMinutes(events);
      const isPast = dateStr <= today;
      const overtimeMinutes = isPast && scheduledMinutes > 0 ? workedMinutes - scheduledMinutes : 0;

      let state: DayState;
      if (leave) {
        state = 'planned_absence';
      } else if (workedMinutes > 0) {
        state = 'worked';
      } else if (shift) {
        state = 'missed';
      } else {
        state = 'free';
      }

      return {
        date: dateStr,
        state,
        isWeekend,
        workedMinutes,
        scheduledMinutes,
        overtimeMinutes,
        leaveTypeName: leave?.typeName ?? undefined,
      };
    });
  }
}
