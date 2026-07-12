import { createRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { rootRoute } from '../root.route';
import { requireSuperadmin } from '@/lib/route-guards';
import { apiClient } from '@/lib/api';
import { getApiError } from '@hecto/api-client';
import { AppLayout } from '@/components/layout/app-layout';
import { EntityTable } from '@/components/entity-table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  PageHeader,
  Spinner,
  cn,
  useToast,
} from '@hecto/ui';
import type {
  AdminOrganization,
  AdminOrgEntityType,
  AdminUser,
  Paginated,
} from '@hecto/shared-types';
import { ADMIN_ORG_ENTITY_TYPES } from '@hecto/shared-types';
import { fmtDateTime } from '@/lib/date';

export const organizationDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/organizations/$id',
  beforeLoad: requireSuperadmin,
  component: OrganizationDetailPage,
});

type Tab = 'users' | AdminOrgEntityType;

const TAB_LABELS: Record<AdminOrgEntityType, string> = {
  'employee-profiles': 'Profiles',
  invitations: 'Invitations',
  'leave-types': 'Leave Types',
  'leave-requests': 'Leave Requests',
  'leave-balances': 'Leave Balances',
  shifts: 'Shifts',
  'recurring-shifts': 'Recurring Shifts',
  'work-events': 'Work Events',
  'event-change-requests': 'Change Requests',
  'employee-availability': 'Availability',
  visits: 'Visits',
  'kiosk-devices': 'Kiosk Devices',
};

function OrganizationDetailPage() {
  const { id } = organizationDetailRoute.useParams();
  const [tab, setTab] = useState<Tab>('users');
  const qc = useQueryClient();
  const toast = useToast();

  const { data: org, isLoading, error } = useQuery({
    queryKey: ['admin-organization', id],
    queryFn: () =>
      apiClient.get<AdminOrganization>(`/admin/organizations/${id}`).then((r) => r.data),
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['admin-organization', id] });
    qc.invalidateQueries({ queryKey: ['admin-organizations'] });
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
        {org && (
          <>
            <PageHeader
              title={org.name}
              description={`/${org.slug} · ${org.userCount} users · created ${fmtDateTime(org.createdAt)}`}
              action={<StatusBadge org={org} />}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <EditOrganizationCard org={org} onSaved={invalidate} />
              <OrgActionsCard
                org={org}
                onDone={(message) => {
                  invalidate();
                  toast(message);
                }}
              />
            </div>

            <div className="border-b border-gray-200">
              <nav className="-mb-px flex flex-wrap gap-1">
                <TabButton active={tab === 'users'} onClick={() => setTab('users')}>
                  Users
                </TabButton>
                {ADMIN_ORG_ENTITY_TYPES.map((t) => (
                  <TabButton key={t} active={tab === t} onClick={() => setTab(t)}>
                    {TAB_LABELS[t]}
                  </TabButton>
                ))}
              </nav>
            </div>

            {tab === 'users' ? (
              <OrgUsersTab orgId={id} />
            ) : (
              <EntityTable orgId={id} entityType={tab} />
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

function StatusBadge({ org }: { org: AdminOrganization }) {
  if (org.deletedAt) return <Badge variant="destructive">Deleted</Badge>;
  if (!org.isActive) return <Badge variant="warning">Disabled</Badge>;
  return <Badge variant="success">Active</Badge>;
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-amber-600 text-amber-700'
          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
      )}
    >
      {children}
    </button>
  );
}

function EditOrganizationCard({
  org,
  onSaved,
}: {
  org: AdminOrganization;
  onSaved: () => void;
}) {
  const [name, setName] = useState(org.name);
  const [slug, setSlug] = useState(org.slug);
  const toast = useToast();

  const save = useMutation({
    mutationFn: () =>
      apiClient.patch<AdminOrganization>(`/admin/organizations/${org.id}`, { name, slug }),
    onSuccess: () => {
      toast('Organization updated');
      onSaved();
    },
  });

  const dirty = name !== org.name || slug !== org.slug;

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <h3 className="text-sm font-semibold text-gray-900">Details</h3>
        {save.error && <Alert variant="error">{getApiError(save.error)}</Alert>}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Slug</label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
        <Button
          size="sm"
          onClick={() => save.mutate()}
          loading={save.isPending}
          disabled={!dirty || !name || !slug}
        >
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
}

type OrgAction = 'disable' | 'enable' | 'soft-delete' | 'restore';

function OrgActionsCard({
  org,
  onDone,
}: {
  org: AdminOrganization;
  onDone: (message: string) => void;
}) {
  const [confirming, setConfirming] = useState<OrgAction | null>(null);

  const act = useMutation({
    mutationFn: (action: OrgAction) =>
      apiClient.post<AdminOrganization>(`/admin/organizations/${org.id}/${action}`),
    onSuccess: (_data, action) => {
      setConfirming(null);
      onDone(`Organization ${action.replace('-', ' ')}d`);
    },
  });

  const descriptions: Record<OrgAction, string> = {
    disable: `Users of "${org.name}" will no longer be able to log in. Existing sessions stay active.`,
    enable: `Users of "${org.name}" will be able to log in again.`,
    'soft-delete': `"${org.name}" will be marked deleted and its users blocked from logging in. Data is kept and the organization can be restored.`,
    restore: `"${org.name}" will be restored and re-enabled.`,
  };

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <h3 className="text-sm font-semibold text-gray-900">Actions</h3>
        {act.error && <Alert variant="error">{getApiError(act.error)}</Alert>}
        <div className="flex flex-wrap gap-2">
          {!org.deletedAt && org.isActive && (
            <Button variant="secondary" size="sm" onClick={() => setConfirming('disable')}>
              Disable
            </Button>
          )}
          {!org.deletedAt && !org.isActive && (
            <Button variant="secondary" size="sm" onClick={() => setConfirming('enable')}>
              Enable
            </Button>
          )}
          {!org.deletedAt && (
            <Button variant="destructive" size="sm" onClick={() => setConfirming('soft-delete')}>
              Soft-delete
            </Button>
          )}
          {org.deletedAt && (
            <Button variant="secondary" size="sm" onClick={() => setConfirming('restore')}>
              Restore
            </Button>
          )}
        </div>
      </CardContent>
      {confirming && (
        <ConfirmDialog
          open
          title={`${confirming.replace('-', ' ')} organization?`}
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

function OrgUsersTab({ orgId }: { orgId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users', { organizationId: orgId }],
    queryFn: () =>
      apiClient
        .get<Paginated<AdminUser>>('/admin/users', {
          params: { organizationId: orgId, limit: 200 },
        })
        .then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error) return <Alert variant="error">{getApiError(error)}</Alert>;
  if (!data || data.items.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-500">No users.</p>;
  }

  return (
    <div className="space-y-2">
      {data.items.map((user) => (
        <Link key={user.id} to="/users/$id" params={{ id: user.id }} className="block">
          <Card className="cursor-pointer transition-shadow hover:shadow-sm">
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{user.email}</p>
                <p className="text-xs text-gray-500">
                  {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{user.role}</Badge>
                {user.deletedAt ? (
                  <Badge variant="destructive">Deleted</Badge>
                ) : !user.isActive ? (
                  <Badge variant="warning">Disabled</Badge>
                ) : (
                  <Badge variant="success">Active</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
