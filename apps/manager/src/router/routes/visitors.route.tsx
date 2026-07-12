import { createRoute, redirect } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { rootRoute } from './root.route';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api';
import { getApiError } from '@hecto/api-client';
import { AppLayout } from '@/components/layout/app-layout';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  DatePicker,
  Dialog,
  PageHeader,
  Spinner,
  useToast,
} from '@hecto/ui';
import type { VisitPublic, VisitSignatureUrlResponse } from '@hecto/shared-types';

export const visitorsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/visitors',
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: '/auth/login' });
    const role = user?.role;
    if (role !== 'admin' && role !== 'hr' && role !== 'manager') {
      throw redirect({ to: '/' });
    }
  },
  component: VisitorsPage,
});

const OPEN_VISITS_POLL_MS = 10_000;

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function VisitorsPage() {
  const [tab, setTab] = useState<'current' | 'history'>('current');

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <PageHeader title="Visitors" />

        <div className="flex gap-2">
          {(['current', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm font-medium border transition-colors ${
                tab === t
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t === 'current' ? 'Currently in' : 'History'}
            </button>
          ))}
        </div>

        {tab === 'current' ? <CurrentVisitors /> : <VisitHistory />}
      </div>
    </AppLayout>
  );
}

function CurrentVisitors() {
  const qc = useQueryClient();
  const toast = useToast();
  const [confirmSignOut, setConfirmSignOut] = useState<VisitPublic | null>(null);

  const { data: visits = [], isLoading, error } = useQuery({
    queryKey: ['visits', 'open'],
    queryFn: () => apiClient.get<VisitPublic[]>('/visits/open').then((r) => r.data),
    refetchInterval: OPEN_VISITS_POLL_MS,
  });

  const signOutMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.post<VisitPublic>(`/visits/${id}/sign-out`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visits'] });
      setConfirmSignOut(null);
      toast('Visitor signed out', 'success');
    },
    onError: (err) => toast(getApiError(err) ?? 'Failed to sign out visitor', 'error'),
  });

  if (isLoading) return <Spinner />;
  if (error) return <Alert variant="error">{getApiError(error) ?? 'Failed to load'}</Alert>;

  return (
    <>
      {visits.length === 0 && <p className="text-sm text-gray-500">No visitors currently in.</p>}

      <div className="space-y-3">
        {visits.map((visit) => (
          <VisitCard
            key={visit.id}
            visit={visit}
            action={
              <Button size="sm" variant="destructive" onClick={() => setConfirmSignOut(visit)}>
                Sign out
              </Button>
            }
          />
        ))}
      </div>

      <Dialog
        open={confirmSignOut !== null}
        onClose={() => setConfirmSignOut(null)}
        title="Sign out visitor"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Sign out <span className="font-medium">{confirmSignOut?.name}</span>? Use this when a
            visitor left without signing out at the kiosk.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmSignOut(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              loading={signOutMutation.isPending}
              onClick={() => confirmSignOut && signOutMutation.mutate(confirmSignOut.id)}
            >
              Sign out
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function VisitHistory() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: visits = [], isLoading, error } = useQuery({
    queryKey: ['visits', 'history', from, to],
    queryFn: () => {
      const params = new URLSearchParams();
      if (from) params.set('from', new Date(from).toISOString());
      // include the whole "to" day
      if (to) params.set('to', new Date(`${to}T23:59:59.999`).toISOString());
      const qs = params.toString();
      return apiClient.get<VisitPublic[]>(`/visits${qs ? `?${qs}` : ''}`).then((r) => r.data);
    },
  });

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          From <DatePicker value={from} onChange={setFrom} />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          To <DatePicker value={to} onChange={setTo} />
        </label>
        {(from || to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFrom('');
              setTo('');
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {isLoading && <Spinner />}
      {error && <Alert variant="error">{getApiError(error) ?? 'Failed to load'}</Alert>}
      {!isLoading && visits.length === 0 && (
        <p className="text-sm text-gray-500">No visits in this period.</p>
      )}

      <div className="space-y-3">
        {visits.map((visit) => (
          <VisitCard key={visit.id} visit={visit} />
        ))}
      </div>
    </>
  );
}

function VisitCard({ visit, action }: { visit: VisitPublic; action?: React.ReactNode }) {
  const [signatureOpen, setSignatureOpen] = useState(false);

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-gray-900">{visit.name}</p>
            {visit.signedOutAt === null ? (
              <Badge variant="success">In</Badge>
            ) : visit.autoClosed ? (
              <Badge variant="warning">Auto-closed</Badge>
            ) : (
              <Badge variant="default">Out</Badge>
            )}
          </div>
          <p className="truncate text-sm text-gray-600">{visit.purpose}</p>
          <p className="text-xs text-gray-500">
            In: {formatDateTime(visit.signedInAt)}
            {visit.signedOutAt && <> · Out: {formatDateTime(visit.signedOutAt)}</>}
            {visit.deviceName && <> · Kiosk: {visit.deviceName}</>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSignatureOpen(true)}>
            Signature
          </Button>
          {action}
        </div>
      </CardContent>

      {signatureOpen && (
        <SignatureDialog visit={visit} onClose={() => setSignatureOpen(false)} />
      )}
    </Card>
  );
}

function SignatureDialog({ visit, onClose }: { visit: VisitPublic; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['visits', visit.id, 'signature-url'],
    queryFn: () =>
      apiClient
        .get<VisitSignatureUrlResponse>(`/visits/${visit.id}/signature-url`)
        .then((r) => r.data),
    staleTime: 0,
  });

  return (
    <Dialog open onClose={onClose} title={`Signature — ${visit.name}`}>
      <div className="flex min-h-40 items-center justify-center">
        {isLoading && <Spinner />}
        {error && <Alert variant="error">{getApiError(error) ?? 'Failed to load signature'}</Alert>}
        {data && (
          <img
            src={data.url}
            alt={`Signature of ${visit.name}`}
            className="max-h-80 max-w-full border border-gray-200 bg-white"
          />
        )}
      </div>
    </Dialog>
  );
}
