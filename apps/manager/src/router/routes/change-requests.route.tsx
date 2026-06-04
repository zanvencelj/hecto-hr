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
  CardHeader,
  CardTitle,
  PageHeader,
  Spinner,
  useToast,
} from '@hecto/ui';
import type { EventChangeRequestPublic } from '@hecto/shared-types';

export const changeRequestsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/change-requests',
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: '/auth/login' });
    const role = user?.role;
    if (role !== 'admin' && role !== 'hr' && role !== 'manager') {
      throw redirect({ to: '/' });
    }
  },
  component: ChangeRequestsPage,
});

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'destructive' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
};

const TYPE_LABELS: Record<string, string> = {
  add: 'Add event',
  edit: 'Edit event',
  delete: 'Delete event',
};

const EVENT_LABELS: Record<string, string> = {
  arrival: 'Arrival',
  departure: 'Departure',
  break_start: 'Break Start',
  break_end: 'Break End',
  remote_arrival: 'Remote Work',
  business_trip_start: 'Trip Start',
  business_trip_end: 'Trip End',
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function ChangeRequestsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ['change-requests', 'org'],
    queryFn: () =>
      apiClient
        .get<EventChangeRequestPublic[]>('/events/change-requests/org')
        .then((r) => r.data),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: 'approved' | 'rejected'; notes?: string }) =>
      apiClient
        .patch(`/events/change-requests/${id}/review`, { status, reviewNotes: notes })
        .then((r) => r.data),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['change-requests'] });
      toast(`Request ${status}`, 'success');
    },
    onError: (err) => toast(getApiError(err) ?? 'Failed to review request', 'error'),
  });

  const filtered = requests.filter((r) =>
    statusFilter === 'all' ? true : r.status === statusFilter,
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <PageHeader title="Event Change Requests" />

        <div className="flex gap-2">
          {['pending', 'approved', 'rejected', 'all'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-sm font-medium border transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {isLoading && <Spinner />}
        {error && <Alert variant="error">{getApiError(error) ?? 'Failed to load'}</Alert>}

        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-gray-500">No {statusFilter === 'all' ? '' : statusFilter} requests.</p>
        )}

        <div className="space-y-3">
          {filtered.map((req) => (
            <Card key={req.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">{TYPE_LABELS[req.requestType]}</CardTitle>
                    <Badge variant={STATUS_BADGE[req.status] ?? 'default'}>{req.status}</Badge>
                  </div>
                  <span className="text-xs text-gray-500">{formatDateTime(req.createdAt)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {req.eventId && (
                  <p className="text-gray-600">
                    <span className="font-medium">Event ID:</span> {req.eventId}
                  </p>
                )}
                {req.requestedType && (
                  <p className="text-gray-600">
                    <span className="font-medium">Requested type:</span>{' '}
                    {EVENT_LABELS[req.requestedType] ?? req.requestedType}
                  </p>
                )}
                {req.requestedOccurredAt && (
                  <p className="text-gray-600">
                    <span className="font-medium">Requested time:</span>{' '}
                    {formatDateTime(req.requestedOccurredAt)}
                  </p>
                )}
                {req.reason && (
                  <p className="text-gray-600">
                    <span className="font-medium">Reason:</span> {req.reason}
                  </p>
                )}
                {req.reviewNotes && (
                  <p className="text-gray-600">
                    <span className="font-medium">Review notes:</span> {req.reviewNotes}
                  </p>
                )}

                {req.status === 'pending' && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Review notes (optional)"
                      value={reviewNotes[req.id] ?? ''}
                      onChange={(e) =>
                        setReviewNotes((prev) => ({ ...prev, [req.id]: e.target.value }))
                      }
                      className="flex h-9 flex-1 border border-gray-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
                    />
                    <Button
                      size="sm"
                      onClick={() =>
                        reviewMutation.mutate({
                          id: req.id,
                          status: 'approved',
                          notes: reviewNotes[req.id],
                        })
                      }
                      loading={reviewMutation.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        reviewMutation.mutate({
                          id: req.id,
                          status: 'rejected',
                          notes: reviewNotes[req.id],
                        })
                      }
                      loading={reviewMutation.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
