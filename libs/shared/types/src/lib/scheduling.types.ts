export type AvailabilityPreference = 'preferred' | 'available' | 'unavailable';

export type AssignmentStrategy = 'preference_first' | 'fairness_first' | 'preference_only';

export type SchedulingDefaultAvailability = 'available' | 'unavailable';

export interface SchedulingSettingsPublic {
  organizationId: string;
  maxHoursPerWeek: number;
  minRestHours: number;
  enforceMaxHours: boolean;
  enforceRestRule: boolean;
  defaultAvailability: SchedulingDefaultAvailability;
  assignmentStrategy: AssignmentStrategy;
  allowClaimingDuringDraft: boolean;
}

export interface StaffingTemplatePublic {
  id: string;
  organizationId: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  headcount: number;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

export type ScheduleDraftStatus = 'draft' | 'published' | 'discarded';

export type DraftAssignmentStatus = 'proposed' | 'manual' | 'stale' | 'unfilled';

export interface DraftAssignmentPublic {
  id: string;
  draftId: string;
  shiftId: string;
  userId: string | null;
  status: DraftAssignmentStatus;
  score: number | null;
  reason: string | null;
  shift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    notes: string | null;
  };
}

export interface ScheduleDraftPublic {
  id: string;
  organizationId: string;
  dateFrom: string;
  dateTo: string;
  status: ScheduleDraftStatus;
  assignments: DraftAssignmentPublic[];
  publishedAt: string | null;
  createdAt: string;
}

export interface PublishDroppedShift {
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface PublishResultPublic {
  published: number;
  dropped: PublishDroppedShift[];
}

export interface ShiftCandidatePublic {
  userId: string;
  eligible: boolean;
  reason: string | null;
  preference: AvailabilityPreference;
  weeklyHours: number;
}

export interface EmployeeAvailabilityPublic {
  id: string;
  userId: string;
  organizationId: string;
  dayOfWeek: number;
  preference: AvailabilityPreference;
  timeFrom: string | null;
  timeTo: string | null;
}
