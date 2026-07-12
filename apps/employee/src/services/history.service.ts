import type { EventChangeRequestPublic, CreateChangeRequestPayload } from '@hecto/shared-types';
import { api } from '@/lib/api';

export async function getMyChangeRequests(): Promise<EventChangeRequestPublic[]> {
  const { data } = await api.get<EventChangeRequestPublic[]>('/events/change-requests/me');
  return data;
}

export async function createChangeRequest(
  payload: CreateChangeRequestPayload,
): Promise<EventChangeRequestPublic> {
  const { data } = await api.post<EventChangeRequestPublic>('/events/change-requests', payload);
  return data;
}
