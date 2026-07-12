export interface ShiftBreakPublic {
  id: string;
  shiftId: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  isFixed: boolean;
  isPaid: boolean;
  notes: string | null;
}

export interface ShiftPublic {
  id: string;
  userId: string | null;
  organizationId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  recurringShiftId: string | null;
  breaks: ShiftBreakPublic[];
  createdAt: string;
}

export interface LeaveTypePublic {
  id: string;
  organizationId: string | null;
  name: string;
  code: string;
  color: string;
  defaultDaysPerYear: number;
  isPaid: boolean;
  isActive: boolean;
}

export interface LeaveBalancePublic {
  id: string;
  userId: string;
  organizationId: string;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  leaveTypeColor: string;
  year: number;
  totalDays: string | null; // null = no limit set
  usedDays: string;
  pendingDays: string;
}

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequestPublic {
  id: string;
  userId: string;
  employeeName: string;
  organizationId: string;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  leaveTypeColor: string;
  startDate: string;
  endDate: string;
  totalDays: string;
  status: LeaveRequestStatus;
  requestedByUserId: string;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  isManualEntry: boolean;
  isEdited: boolean;
  editedAt: string | null;
  editedByUserId: string | null;
  notes: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

export interface SetLeaveBalanceDto {
  userId: string;
  leaveTypeId: string;
  year: number;
  totalDays: number;
}
