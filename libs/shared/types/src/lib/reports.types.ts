export type DayState = 'worked' | 'planned_absence' | 'missed' | 'free' | 'weekend';

export interface DaySummary {
  date: string;
  state: DayState;
  isWeekend: boolean;
  workedMinutes: number;
  scheduledMinutes: number;
  overtimeMinutes: number;
  leaveTypeName?: string;
}

export interface MonthlySummary {
  year: number;
  month: number;
  totalWorkedMinutes: number;
  totalScheduledMinutes: number;
  totalOvertimeMinutes: number;
  days: DaySummary[];
}

export interface YearlySummary {
  year: number;
  totalWorkedMinutes: number;
  totalScheduledMinutes: number;
  totalOvertimeMinutes: number;
  months: MonthlySummary[];
}
