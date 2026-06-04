export type WorkEventType =
  | 'arrival'
  | 'departure'
  | 'break_start'
  | 'break_end'
  | 'remote_arrival'
  | 'business_trip_start'
  | 'business_trip_end';

export interface WorkEventPublic {
  id: string;
  userId: string;
  organizationId: string;
  type: WorkEventType;
  notes: string | null;
  occurredAt: string;
  createdAt: string;
}

export type ChangeRequestType = 'add' | 'edit' | 'delete';
export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface EventChangeRequestPublic {
  id: string;
  userId: string;
  organizationId: string;
  requestType: ChangeRequestType;
  eventId: string | null;
  requestedType: WorkEventType | null;
  requestedOccurredAt: string | null;
  requestedNotes: string | null;
  reason: string | null;
  status: ChangeRequestStatus;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  employeeName?: string;
}

export interface CreateChangeRequestPayload {
  requestType: ChangeRequestType;
  eventId?: string;
  requestedType?: WorkEventType;
  requestedOccurredAt?: string;
  requestedNotes?: string;
  reason?: string;
}

export interface ReviewChangeRequestPayload {
  status: 'approved' | 'rejected';
  reviewNotes?: string;
}
