import type { AvailabilityPreference, ShiftPublic } from '@hecto/shared-types';
import { api } from '@/lib/api';

export interface AvailabilityEntry {
  id: string;
  userId: string;
  organizationId: string;
  dayOfWeek: number;
  preference: AvailabilityPreference;
  timeFrom: string | null;
  timeTo: string | null;
}

export interface SetAvailabilityPayload {
  dayOfWeek: number;
  preference: AvailabilityPreference;
  timeFrom?: string;
  timeTo?: string;
}

export async function getMyShifts(userId: string, from: string, to: string): Promise<ShiftPublic[]> {
  const { data } = await api.get<ShiftPublic[]>(`/shifts/employee/${userId}`, {
    params: { from, to },
  });
  return data;
}

export async function getOpenShifts(from: string, to: string): Promise<ShiftPublic[]> {
  const { data } = await api.get<ShiftPublic[]>('/shifts/open', { params: { from, to } });
  return data;
}

export async function claimShift(id: string): Promise<ShiftPublic> {
  const { data } = await api.post<ShiftPublic>(`/shifts/${id}/claim`);
  return data;
}

export async function getMyAvailability(): Promise<AvailabilityEntry[]> {
  const { data } = await api.get<AvailabilityEntry[]>('/shifts/availability/me');
  return data;
}

export async function setAvailability(payload: SetAvailabilityPayload): Promise<AvailabilityEntry> {
  const { data } = await api.post<AvailabilityEntry>('/shifts/availability/me', payload);
  return data;
}
