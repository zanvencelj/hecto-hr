import { createRoute, redirect } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { rootRoute } from '../root.route';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api';
import { getApiError } from '@hecto/api-client';
import { AppLayout } from '@/components/layout/app-layout';
import { fmtDate } from '@/lib/date';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  DatePicker,
  FormField,
  Input,
  PageHeader,
  Spinner,
  Textarea,
  useToast,
} from '@hecto/ui';
import type {
  EmployeePublic,
  LeaveBalancePublic,
  LeaveRequestPublic,
  LeaveTypePublic,
} from '@hecto/shared-types';

export const leaveManagerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leave',
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: '/auth/login' });
    const role = user?.role;
    if (role !== 'admin' && role !== 'hr' && role !== 'manager') {
      throw redirect({ to: '/my-leave' });
    }
  },
  component: LeaveManagerPage,
});

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'destructive' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  cancelled: 'default',
};

type Tab = 'requests' | 'balances';

function LeaveManagerPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('requests');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [editingDays, setEditingDays] = useState<string | null>(null);
  const [editDaysValue, setEditDaysValue] = useState('');

  const year = new Date().getFullYear();

  const { data: requests, isLoading: loadingRequests, error } = useQuery({
    queryKey: ['leave-requests', 'org', statusFilter],
    queryFn: () =>
      apiClient
        .get<LeaveRequestPublic[]>('/leave/requests/org', {
          params: statusFilter !== 'all' ? { status: statusFilter } : {},
        })
        .then((r) => r.data),
    enabled: tab === 'requests',
  });

  const { data: orgBalances } = useQuery({
    queryKey: ['leave-balances', 'org', year],
    queryFn: () =>
      apiClient.get<LeaveBalancePublic[]>('/leave/balances/org', { params: { year } }).then((r) => r.data),
    enabled: tab === 'requests',
  });

  const balanceMap = new Map<string, LeaveBalancePublic>();
  orgBalances?.forEach((b) => balanceMap.set(`${b.userId}:${b.leaveTypeId}`, b));

  const review = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: 'approved' | 'rejected'; notes?: string }) =>
      apiClient.patch(`/leave/requests/${id}/review`, { status, reviewNotes: notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
      toast('Request updated');
    },
    onError: (err) => toast(getApiError(err), 'error'),
  });

  const editDays = useMutation({
    mutationFn: ({ id, totalDays }: { id: string; totalDays: number }) =>
      apiClient.patch<LeaveRequestPublic>(`/leave/requests/${id}/days`, { totalDays }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
      setEditingDays(null);
      toast('Days updated');
    },
    onError: (err) => toast(getApiError(err), 'error'),
  });

  function startEditDays(req: LeaveRequestPublic) {
    setEditingDays(req.id);
    setEditDaysValue(req.totalDays);
  }

  function saveEditDays(id: string) {
    const v = parseFloat(editDaysValue);
    if (isNaN(v) || v <= 0) return;
    editDays.mutate({ id, totalDays: v });
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <PageHeader
          title="Leave Management"
          description="Review requests and manage employee leave balances."
          action={
            tab === 'requests' ? (
              <Button size="sm" onClick={() => setShowAssignForm(true)}>
                Assign leave
              </Button>
            ) : undefined
          }
        />

        {/* tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {(['requests', 'balances'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'border-b-2 border-indigo-600 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'requests' && (
          <>
            {showAssignForm && (
              <AssignLeaveForm
                onSuccess={() => {
                  setShowAssignForm(false);
                  qc.invalidateQueries({ queryKey: ['leave-requests'] });
                  qc.invalidateQueries({ queryKey: ['leave-balances'] });
                  toast('Leave assigned');
                }}
                onCancel={() => setShowAssignForm(false)}
              />
            )}

            <div className="flex gap-1 border-b border-gray-100">
              {['pending', 'approved', 'rejected', 'all'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    statusFilter === s
                      ? 'border-b-2 border-indigo-600 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {error && <Alert variant="error">{getApiError(error)}</Alert>}

            {loadingRequests ? (
              <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : (
              <div className="space-y-3">
                {requests?.map((req) => {
                  const bal = balanceMap.get(`${req.userId}:${req.leaveTypeId}`);
                  const usedDays = parseFloat(bal?.usedDays ?? '0');
                  const pendingDays = parseFloat(bal?.pendingDays ?? '0');
                  const totalAlloc = bal?.totalDays ? parseFloat(bal.totalDays) : null;
                  const isEditingThis = editingDays === req.id;

                  return (
                    <Card key={req.id}>
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1 space-y-1.5">
                            {/* type + status badges */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: req.leaveTypeColor }}
                              />
                              <span className="text-sm font-semibold text-gray-900">{req.leaveTypeName}</span>
                              <Badge variant={STATUS_BADGE[req.status] ?? 'default'}>{req.status}</Badge>
                              {req.isManualEntry && <Badge variant="secondary">Manual</Badge>}
                              {req.isEdited && (
                                <Badge variant="secondary" title={req.editedAt ? `Edited ${fmtDate(req.editedAt)}` : undefined}>
                                  Edited
                                </Badge>
                              )}
                            </div>

                            {/* employee */}
                            <p className="text-sm font-medium text-gray-800">{req.employeeName}</p>

                            {/* dates + days with inline edit */}
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-gray-700">
                                {fmtDate(req.startDate)} – {fmtDate(req.endDate)}
                              </p>
                              {isEditingThis ? (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-sm text-gray-500">(</span>
                                  <input
                                    type="number"
                                    min={0.5}
                                    step={0.5}
                                    value={editDaysValue}
                                    onChange={(e) => setEditDaysValue(e.target.value)}
                                    autoFocus
                                    className="w-14 border border-indigo-300 px-1 py-0.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEditDays(req.id);
                                      if (e.key === 'Escape') setEditingDays(null);
                                    }}
                                  />
                                  <span className="text-sm text-gray-500">days)</span>
                                  <button
                                    onClick={() => saveEditDays(req.id)}
                                    disabled={editDays.isPending}
                                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={() => setEditingDays(null)}
                                    className="text-xs text-gray-400 hover:text-gray-600"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <span className="flex items-center gap-1 text-sm text-gray-500">
                                  ({req.totalDays} days)
                                  <button
                                    onClick={() => startEditDays(req)}
                                    className="ml-0.5 text-gray-400 hover:text-indigo-600 transition-colors"
                                    title="Edit days"
                                  >
                                    ✎
                                  </button>
                                </span>
                              )}
                            </div>

                            {/* balance snapshot */}
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <span>Balance:</span>
                              <span className="font-medium text-red-600">{usedDays}d used</span>
                              {pendingDays > 0 && (
                                <span className="font-medium text-amber-500">+{pendingDays}d pending</span>
                              )}
                              <span className="text-gray-400">/</span>
                              <span className="font-medium text-gray-700">
                                {totalAlloc !== null ? `${totalAlloc}d` : '∞'}
                              </span>
                            </div>

                            {req.notes && <p className="text-sm text-gray-500 italic">"{req.notes}"</p>}
                            <p className="text-xs text-gray-400">Requested {fmtDate(req.createdAt)}</p>
                          </div>

                          {req.status === 'pending' && (
                            <div className="flex shrink-0 flex-col gap-2">
                              <Input
                                placeholder="Review notes (optional)"
                                value={reviewNotes[req.id] ?? ''}
                                onChange={(e) => setReviewNotes((n) => ({ ...n, [req.id]: e.target.value }))}
                                className="w-48 text-xs"
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => review.mutate({ id: req.id, status: 'approved', notes: reviewNotes[req.id] })}
                                  loading={review.isPending && review.variables?.id === req.id && review.variables.status === 'approved'}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => review.mutate({ id: req.id, status: 'rejected', notes: reviewNotes[req.id] })}
                                  loading={review.isPending && review.variables?.id === req.id && review.variables.status === 'rejected'}
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {requests?.length === 0 && (
                  <p className="py-8 text-center text-sm text-gray-500">
                    No {statusFilter !== 'all' ? statusFilter : ''} leave requests.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'balances' && <BalancesTab />}
      </div>
    </AppLayout>
  );
}

// ─── balances tab ─────────────────────────────────────────────────────────────

function BalancesTab() {
  const year = new Date().getFullYear();
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<{ userId: string; leaveTypeId: string; current: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data: employees, isLoading: loadingEmp } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiClient.get<EmployeePublic[]>('/employees').then((r) => r.data),
  });

  const { data: leaveTypes, isLoading: loadingTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => apiClient.get<LeaveTypePublic[]>('/leave/types').then((r) => r.data),
  });

  const { data: orgBalances, isLoading: loadingBalances } = useQuery({
    queryKey: ['leave-balances', 'org', year],
    queryFn: () =>
      apiClient.get<LeaveBalancePublic[]>('/leave/balances/org', { params: { year } }).then((r) => r.data),
  });

  const setBalance = useMutation({
    mutationFn: ({ userId, leaveTypeId, totalDays }: { userId: string; leaveTypeId: string; totalDays: number }) =>
      apiClient.post('/leave/balances', { userId, leaveTypeId, year, totalDays }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
      setEditing(null);
      toast('Balance updated');
    },
    onError: (err) => toast(getApiError(err), 'error'),
  });

  const isLoading = loadingEmp || loadingTypes || loadingBalances;

  const balanceMap = new Map<string, LeaveBalancePublic>();
  orgBalances?.forEach((b) => balanceMap.set(`${b.userId}:${b.leaveTypeId}`, b));

  const activeEmployees = employees?.filter((e) => e.isActive) ?? [];
  const activeTypes = leaveTypes?.filter((t) => t.isActive) ?? [];

  function startEdit(userId: string, leaveTypeId: string, current: string | null) {
    setEditing({ userId, leaveTypeId, current: current ?? '' });
    setEditValue(current ?? '');
  }

  function saveEdit() {
    if (!editing) return;
    const days = parseFloat(editValue);
    if (isNaN(days) || days < 0) return;
    setBalance.mutate({ userId: editing.userId, leaveTypeId: editing.leaveTypeId, totalDays: days });
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Click any cell to set a quota. Leave blank / 0 for no limit.
        Showing {year}.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200 bg-white text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600 min-w-[160px]">
                Employee
              </th>
              {activeTypes.map((lt) => (
                <th key={lt.id} className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-600 min-w-[120px]">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: lt.color }} />
                    {lt.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeEmployees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="border border-gray-200 px-3 py-2">
                  <div className="font-medium text-gray-900">
                    {[emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.email}
                  </div>
                  {emp.position && <div className="text-xs text-gray-400">{emp.position}</div>}
                </td>
                {activeTypes.map((lt) => {
                  const b = balanceMap.get(`${emp.id}:${lt.id}`);
                  const isEditing = editing?.userId === emp.id && editing?.leaveTypeId === lt.id;
                  const used = parseFloat(b?.usedDays ?? '0');
                  const pending = parseFloat(b?.pendingDays ?? '0');
                  const total = b?.totalDays ? parseFloat(b.totalDays) : null;

                  return (
                    <td
                      key={lt.id}
                      className="border border-gray-200 px-2 py-1 text-center align-middle cursor-pointer hover:bg-indigo-50 transition-colors"
                      onClick={() => !isEditing && startEdit(emp.id, lt.id, b?.totalDays ?? null)}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="∞"
                            autoFocus
                            className="w-16 border border-indigo-300 px-1 py-0.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') setEditing(null);
                            }}
                          />
                          <button
                            onClick={saveEdit}
                            disabled={setBalance.isPending}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs">
                          <div className="font-medium text-gray-900">
                            {used > 0 || pending > 0 ? (
                              <>
                                <span className="text-red-600">{used}</span>
                                {pending > 0 && <span className="text-amber-500"> +{pending}p</span>}
                                <span className="text-gray-400"> / </span>
                                <span>{total !== null ? total : '∞'}</span>
                              </>
                            ) : (
                              <span className="text-gray-400">
                                {total !== null ? `0 / ${total}` : '∞'}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {activeEmployees.length === 0 && (
              <tr>
                <td colSpan={activeTypes.length + 1} className="py-8 text-center text-sm text-gray-400">
                  No active employees.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        Red = used days · amber = pending · ∞ = no limit set
      </p>
    </div>
  );
}

// ─── assign leave form ────────────────────────────────────────────────────────

function AssignLeaveForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [userId, setUserId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiClient.get<EmployeePublic[]>('/employees').then((r) => r.data),
  });

  const { data: leaveTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => apiClient.get<LeaveTypePublic[]>('/leave/types').then((r) => r.data),
  });

  const assign = useMutation({
    mutationFn: () =>
      apiClient.post('/leave/requests', {
        userId,
        leaveTypeId,
        startDate,
        endDate,
        notes: notes || undefined,
        isManualEntry: true,
      }),
    onSuccess,
    onError: (err) => setError(getApiError(err)),
  });

  return (
    <Card className="border-indigo-100 bg-indigo-50">
      <CardContent className="pt-4">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Assign leave manually</h3>
        {error && <Alert variant="error" className="mb-3">{error}</Alert>}
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Employee *">
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="h-10 w-full border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Select employee…</option>
              {employees?.filter((e) => e.isActive).map((e) => (
                <option key={e.id} value={e.id}>
                  {[e.firstName, e.lastName].filter(Boolean).join(' ') || e.email}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Leave type *">
            <select
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              className="h-10 w-full border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Select type…</option>
              {leaveTypes?.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Start date *">
            <DatePicker value={startDate} onChange={setStartDate} />
          </FormField>
          <FormField label="End date *">
            <DatePicker value={endDate} onChange={setEndDate} />
          </FormField>
          <FormField label="Notes" className="sm:col-span-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </FormField>
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            onClick={() => assign.mutate()}
            loading={assign.isPending}
            disabled={!userId || !leaveTypeId || !startDate || !endDate}
          >
            Assign leave
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
