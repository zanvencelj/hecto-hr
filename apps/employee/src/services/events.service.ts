import type { WorkEventPublic, WorkEventType } from '@hecto/shared-types';
import { api } from '@/lib/api';

export interface CreateEventPayload {
  type: WorkEventType;
  notes?: string;
}

export async function createEvent(payload: CreateEventPayload): Promise<WorkEventPublic> {
  const { data } = await api.post<WorkEventPublic>('/events', payload);
  return data;
}

export async function getMyEvents(from?: string, to?: string): Promise<WorkEventPublic[]> {
  const { data } = await api.get<WorkEventPublic[]>('/events/me', {
    params: { from, to },
  });
  return data;
}
