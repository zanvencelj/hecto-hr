import { createRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { rootRoute } from '../root.route';
import { requireSuperadmin } from '@/lib/route-guards';
import { apiClient } from '@/lib/api';
import { getApiError } from '@hecto/api-client';
import { AppLayout } from '@/components/layout/app-layout';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  PageHeader,
  Select,
  Spinner,
  useToast,
} from '@hecto/ui';
import type { AdminSessionInfo, AdminUser } from '@hecto/shared-types';
import { fmtDateTime } from '@/lib/date';

export const userDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users/$id',
  beforeLoad: requireSuperadmin,
  component: UserDetailPage,
});

function UserDetailPage() {
  const { id } = userDetailRoute.useParams();
  const qc = useQueryClient();
  const toast = useToast();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => apiClient.get<AdminUser>(`/admin/users/${id}`).then((r) => r.data),
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['admin-user', id] });
    qc.invalidateQueries({ queryKey: ['admin-users'] });
    qc.invalidateQueries({ queryKey: ['admin-user-sessions', id] });
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        {error && <Alert variant="error">{getApiError(error)}</Alert>}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}
        {user && (
          <>
            <PageHeader
              title={user.email}
              description={
                user.organizationName
                  ? `Member of ${user.organizationName}`
                  : 'No organization'
              }
              action={<UserStatusBadge user={user} />}
            />
            {user.organizationId && (
              <Link
                to="/organizations/$id"
                params={{ id: user.organizationId }}
                className="inline-block text-sm text-amber-700 underline-offset-4 hover:underline"
              >
                ← View organization
              </Link>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <EditUserCard user={user} onSaved={invalidate} />
              <UserActionsCard
                user={user}
                onDone={(message) => {
                  invalidate();
                  toast(message);
                }}
              />
            </div>

            <SessionsCard userId={id} />
          </>
        )}
      </div>
    </AppLayout>
  );
}

function UserStatusBadge({ user }: { user: AdminUser }) {
  if (user.deletedAt) return <Badge variant="destructive">Deleted</Badge>;
  if (!user.isActive) return <Badge variant="warning">Disabled</Badge>;
  return <Badge variant="success">Active</Badge>;
}

const EDITABLE_ROLES = ['admin', 'hr', 'manager', 'employee'] as const;

function EditUserCard({ user, onSaved }: { user: AdminUser; onSaved: () => void }) {
  const [firstName, setFirstName] = useState(user.firstName ?? '');
  const [lastName, setLastName] = useState(user.lastName ?? '');
  const [username, setUsername] = useState(user.username ?? '');
  const [role, setRole] = useState(user.role);
  const toast = useToast();

  const isSuperadmin = user.role === 'superadmin';

  const save = useMutation({
    mutationFn: () =>
      apiClient.patch<AdminUser>(`/admin/users/${user.id}`, {
        firstName,
        lastName,
        username,
        role,
      }),
    onSuccess: () => {
      toast('User updated');
      onSaved();
    },
  });

  const dirty =
    firstName !== (user.firstName ?? '') ||
    lastName !== (user.lastName ?? '') ||
    username !== (user.username ?? '') ||
    role !== user.role;

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <h3 className="text-sm font-semibold text-gray-900">Details</h3>
        {isSuperadmin && (
          <Alert variant="info">
            Superadmin accounts are managed via the CLI script and cannot be edited here.
          </Alert>
        )}
        {save.error && <Alert variant="error">{getApiError(save.error)}</Alert>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">First name</label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isSuperadmin}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Last name</label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isSuperadmin}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSuperadmin}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Role</label>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as AdminUser['role'])}
              disabled={isSuperadmin}
            >
              {isSuperadmin ? (
                <option value="superadmin">superadmin</option>
              ) : (
                EDITABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))
              )}
            </Select>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => save.mutate()}
          loading={save.isPending}
          disabled={!dirty || isSuperadmin}
        >
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
}

type UserAction =
  | 'disable'
  | 'enable'
  | 'soft-delete'
  | 'restore'
  | 'revoke-sessions'
  | 'force-password-reset';

const ACTION_LABELS: Record<UserAction, string> = {
  disable: 'Disable',
  enable: 'Enable',
  'soft-delete': 'Soft-delete',
  restore: 'Restore',
  'revoke-sessions': 'Revoke sessions',
  'force-password-reset': 'Send password reset',
};

const ACTION_DONE: Record<UserAction, string> = {
  disable: 'User disabled',
  enable: 'User enabled',
  'soft-delete': 'User soft-deleted and sessions revoked',
  restore: 'User restored',
  'revoke-sessions': 'All sessions revoked',
  'force-password-reset': 'Password reset email sent',
};

function UserActionsCard({
  user,
  onDone,
}: {
  user: AdminUser;
  onDone: (message: string) => void;
}) {
  const [confirming, setConfirming] = useState<UserAction | null>(null);
  const isSuperadmin = user.role === 'superadmin';

  const act = useMutation({
    mutationFn: (action: UserAction) => apiClient.post(`/admin/users/${user.id}/${action}`),
    onSuccess: (_data, action) => {
      setConfirming(null);
      onDone(ACTION_DONE[action]);
    },
  });

  const descriptions: Record<UserAction, string> = {
    disable: `${user.email} will no longer be able to log in.`,
    enable: `${user.email} will be able to log in again.`,
    'soft-delete': `${user.email} will be marked deleted and all their sessions revoked. The account can be restored later.`,
    restore: `${user.email} will be restored and re-enabled.`,
    'revoke-sessions': `All active sessions of ${user.email} will be signed out immediately.`,
    'force-password-reset': `A password reset email will be sent to ${user.email}.`,
  };

  if (isSuperadmin) {
    return (
      <Card>
        <CardContent className="pt-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Actions</h3>
          <p className="text-sm text-gray-500">Not available for superadmin accounts.</p>
        </CardContent>
      </Card>
    );
  }

  const available: UserAction[] = [
    ...(user.deletedAt
      ? (['restore'] as UserAction[])
      : ([
          user.isActive ? 'disable' : 'enable',
          'soft-delete',
          'revoke-sessions',
          'force-password-reset',
        ] as UserAction[])),
  ];

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <h3 className="text-sm font-semibold text-gray-900">Actions</h3>
        {act.error && <Alert variant="error">{getApiError(act.error)}</Alert>}
        <div className="flex flex-wrap gap-2">
          {available.map((action) => (
            <Button
              key={action}
              variant={action === 'soft-delete' ? 'destructive' : 'secondary'}
              size="sm"
              onClick={() => setConfirming(action)}
            >
              {ACTION_LABELS[action]}
            </Button>
          ))}
        </div>
      </CardContent>
      {confirming && (
        <ConfirmDialog
          open
          title={`${ACTION_LABELS[confirming]}?`}
          description={descriptions[confirming]}
          confirmLabel="Confirm"
          destructive={confirming === 'soft-delete' || confirming === 'disable'}
          loading={act.isPending}
          onConfirm={() => act.mutate(confirming)}
          onClose={() => setConfirming(null)}
        />
      )}
    </Card>
  );
}

function SessionsCard({ userId }: { userId: string }) {
  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ['admin-user-sessions', userId],
    queryFn: () =>
      apiClient.get<AdminSessionInfo[]>(`/admin/users/${userId}/sessions`).then((r) => r.data),
  });

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <h3 className="text-sm font-semibold text-gray-900">Sessions (read-only)</h3>
        {error && <Alert variant="error">{getApiError(error)}</Alert>}
        {isLoading && (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )}
        {sessions && sessions.length === 0 && (
          <p className="text-sm text-gray-500">No sessions.</p>
        )}
        {sessions && sessions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">Device</th>
                  <th className="px-3 py-2">Platform</th>
                  <th className="px-3 py-2">IP</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Last used</th>
                  <th className="px-3 py-2">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                      {s.deviceName ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                      {s.platform ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                      {s.ipAddress ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {s.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="default">Revoked</Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                      {fmtDateTime(s.lastUsedAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                      {fmtDateTime(s.expiresAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
