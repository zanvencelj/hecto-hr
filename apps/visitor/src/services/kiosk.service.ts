import type { KioskOpenVisit, KioskPairResponse } from '@hecto/shared-types';
import { api } from '@/lib/api';

export async function pairDevice(code: string): Promise<KioskPairResponse> {
  const { data } = await api.post<KioskPairResponse>('/kiosk/pair', { code });
  return data;
}

export async function getOpenVisits(): Promise<KioskOpenVisit[]> {
  const { data } = await api.get<KioskOpenVisit[]>('/kiosk/visits/open');
  return data;
}

export async function signInVisitor(input: {
  name: string;
  purpose: string;
  signature: string;
}): Promise<KioskOpenVisit> {
  const { data } = await api.post<KioskOpenVisit>('/kiosk/visits', input);
  return data;
}

export async function signOutVisitor(visitId: string): Promise<KioskOpenVisit> {
  const { data } = await api.post<KioskOpenVisit>(`/kiosk/visits/${visitId}/sign-out`);
  return data;
}
