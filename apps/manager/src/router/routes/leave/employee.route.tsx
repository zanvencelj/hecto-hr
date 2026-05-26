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
  PageHeader,
  Spinner,
  Textarea,
} from '@hecto/ui';
import type { LeaveBalancePublic, LeaveRequestPublic, LeaveTypePublic } from '@hecto/shared-types';

export const leaveEmployeeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/my-leave',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: '/auth/login' });
  },
  component: LeaveEmployeePage,
});

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'destructive' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  cancelled: 'default',
};

function LeaveEmployeePage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [error, setError] = useState('');
  const year = new Date().getFullYear();

  const { data: balances, isLoading: loadingBalances } = useQuery({
    queryKey: ['leave-balances', user?.id, year],
    queryFn: () =>
      user
        ? apiClient
            .get<LeaveBalancePublic[]>(`/leave/balances/employee/${user.id}`, { params: { year } })
            .then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!user,
  });

  const { data: requests, isLoading: loadingRequests } = useQuery({
    queryKey: ['leave-requests', 'me', user?.id],
    queryFn: () =>
      user
        ? apiClient
            .get<LeaveRequestPublic[]>(`/leave/requests/employee/${user.id}`)
            .then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!user,
  });

  const cancelRequest = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/leave/requests/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests', 'me'] });
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
    },
    onError: (err) => setError(getApiError(err)),
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <PageHeader
          title="My Leave"
          description="View your leave balances and manage requests."
          action={
            <Button size="sm" onClick={() => setShowRequestForm(true)}>
              Request leave
            </Button>
          }
        />

        {error && <Alert variant="error">{error}</Alert>}

        {showRequestForm && (
          <RequestLeaveForm
            onSuccess={() => {
              setShowRequestForm(false);
              qc.invalidateQueries({ queryKey: ['leave-requests', 'me'] });
              qc.invalidateQueries({ queryKey: ['leave-balances'] });
            }}
            onCancel={() => setShowRequestForm(false)}
          />
        )}

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Leave balances — {year}
          </h2>
          {loadingBalances ? (
            <Spinner />
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {balances?.map((b) => {
                const used = parseFloat(b.usedDays);
                const pending = parseFloat(b.pendingDays);
                const total = b.totalDays ? parseFloat(b.totalDays) : null;
                const remaining = total !== null ? total - used - pending : null;
                return (
                  <Card key={b.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: b.leaveTypeColor }} />
                        <span className="text-sm font-medium text-gray-700">{b.leaveTypeName}</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {remaining !== null ? remaining : '∞'}
                        <span className="ml-1 text-sm font-normal text-gray-400">remaining</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {b.usedDays} used
                        {pending > 0 && <> · {b.pendingDays} pending</>}
                        {total !== null ? <> · {b.totalDays} total</> : <> · no limit</>}
                      </div>
                      {total !== null && (
                        <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              backgroundColor: b.leaveTypeColor,
                              width: `${Math.min(100, (used / total) * 100)}%`,
                            }}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {(!balances || balances.length === 0) && (
                <p className="col-span-3 py-4 text-center text-sm text-gray-400">
                  No leave types configured.
                </p>
              )}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Leave requests</h2>
          {loadingRequests ? (
            <Spinner />
          ) : (
            <div className="space-y-2">
              {requests?.map((req) => (
                <Card key={req.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: req.leaveTypeColor }}
                        />
                        <span className="text-sm font-medium text-gray-900">{req.leaveTypeName}</span>
                        <Badge variant={STATUS_BADGE[req.status] ?? 'default'}>
                          {req.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {fmtDate(req.startDate)} – {fmtDate(req.endDate)}{' '}
                        <span className="text-gray-400">({req.totalDays} days)</span>
                      </p>
                      {req.notes && (
                        <p className="text-xs text-gray-400 italic">"{req.notes}"</p>
                      )}
                      {req.reviewNotes && (
                        <p className="text-xs text-gray-500">Manager: "{req.reviewNotes}"</p>
                      )}
                    </div>
                    {(req.status === 'pending' || req.status === 'approved') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cancelRequest.mutate(req.id)}
                        loading={cancelRequest.isPending && cancelRequest.variables === req.id}
                      >
                        Cancel
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
              {requests?.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-400">
                  No leave requests yet.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function RequestLeaveForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const { user } = useAuthStore();
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const { data: leaveTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => apiClient.get<LeaveTypePublic[]>('/leave/types').then((r) => r.data),
  });

  const request = useMutation({
    mutationFn: () =>
      apiClient.post('/leave/requests', {
        userId: user?.id,
        leaveTypeId,
        startDate,
        endDate,
        notes: notes || undefined,
        isManualEntry: false,
      }),
    onSuccess,
    onError: (err) => setError(getApiError(err)),
  });

  return (
    <Card className="border-indigo-100 bg-indigo-50">
      <CardContent className="pt-4">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Request leave</h3>
        {error && <Alert variant="error" className="mb-3">{error}</Alert>}
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Leave type *" className="sm:col-span-2">
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
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional reason or notes"
              rows={2}
            />
          </FormField>
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            onClick={() => request.mutate()}
            loading={request.isPending}
            disabled={!leaveTypeId || !startDate || !endDate}
          >
            Submit request
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
