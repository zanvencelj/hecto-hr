import type { LeaveTypePublic, LeaveBalancePublic, LeaveRequestPublic } from '@hecto/shared-types';
import { api } from '@/lib/api';

export interface CreateLeaveRequestPayload {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

export async function getLeaveTypes(): Promise<LeaveTypePublic[]> {
  const { data } = await api.get<LeaveTypePublic[]>('/leave/types');
  return data;
}

export async function getMyLeaveBalance(userId: string): Promise<LeaveBalancePublic[]> {
  const { data } = await api.get<LeaveBalancePublic[]>(`/leave/balances/employee/${userId}`);
  return data;
}

export async function getMyLeaveRequests(userId: string): Promise<LeaveRequestPublic[]> {
  const { data } = await api.get<LeaveRequestPublic[]>(`/leave/requests/employee/${userId}`);
  return data;
}

export async function createLeaveRequest(
  payload: CreateLeaveRequestPayload,
): Promise<LeaveRequestPublic> {
  const { data } = await api.post<LeaveRequestPublic>('/leave/requests', payload);
  return data;
}

export async function cancelLeaveRequest(id: string): Promise<void> {
  await api.delete(`/leave/requests/${id}`);
}
