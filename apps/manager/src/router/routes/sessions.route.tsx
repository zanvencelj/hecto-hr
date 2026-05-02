import { createRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  PageHeader,
  Separator,
  Spinner,
} from '@hecto/ui';
import type { SessionInfo } from '@hecto/shared-types';

export const sessionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sessions',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: '/auth/login' });
  },
  component: SessionsPage,
});

function SessionsPage() {
  const { clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ['sessions'],
    queryFn: () =>
      apiClient.get<SessionInfo[]>('/auth/sessions').then((r) => r.data),
  });

  const revokeSession = useMutation({
    mutationFn: (sessionId: string) =>
      apiClient.delete(`/auth/sessions/${sessionId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const signOutAll = useMutation({
    mutationFn: () => apiClient.post('/auth/logout-all'),
    onSuccess: () => {
      clearAuth();
      navigate({ to: '/auth/login' });
    },
  });

  const current = sessions?.find((s) => s.isCurrent);
  const others = sessions?.filter((s) => !s.isCurrent) ?? [];

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <PageHeader
          title="Sessions"
          description="Manage the devices where your account is signed in."
        />

        {error && (
          <Alert variant="error">{getApiError(error)}</Alert>
        )}

        {(revokeSession.error || signOutAll.error) && (
          <Alert variant="error">
            {getApiError(revokeSession.error ?? signOutAll.error)}
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-3">
            {current && (
              <SessionCard
                session={current}
                action={null}
              />
            )}

            {others.length > 0 && (
              <>
                {current && <Separator />}
                {others.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    action={
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeSession.mutate(session.id)}
                        loading={
                          revokeSession.isPending &&
                          revokeSession.variables === session.id
                        }
                      >
                        Sign out
                      </Button>
                    }
                  />
                ))}
              </>
            )}

            {sessions && sessions.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-8">
                No active sessions found.
              </p>
            )}
          </div>
        )}

        {others.length > 0 && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-red-900">
                  Sign out all devices
                </p>
                <p className="mt-0.5 text-sm text-red-700">
                  This will end all sessions everywhere, including this one.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => signOutAll.mutate()}
                loading={signOutAll.isPending}
                className="shrink-0"
              >
                Sign out all
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

interface SessionCardProps {
  session: SessionInfo;
  action: React.ReactNode;
}

function SessionCard({ session, action }: SessionCardProps) {
  const lastUsed = formatRelative(new Date(session.lastUsedAt));
  const createdAt = new Date(session.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <DeviceIcon platform={session.platform} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-gray-900">
              {session.deviceName ?? session.platform ?? 'Unknown device'}
            </span>
            {session.isCurrent && (
              <Badge variant="success">Current</Badge>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
            {session.ipAddress && <span>{session.ipAddress}</span>}
            <span>Signed in {createdAt}</span>
            <span>Active {lastUsed}</span>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardContent>
    </Card>
  );
}

function DeviceIcon({ platform }: { platform: string | null }) {
  const isMobile = platform === 'mobile';
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
      {isMobile ? (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
        </svg>
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
          <rect x="2" y="4" width="20" height="13" rx="2" />
          <path strokeLinecap="round" d="M8 21h8M12 17v4" />
        </svg>
      )}
    </div>
  );
}

function formatRelative(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}
