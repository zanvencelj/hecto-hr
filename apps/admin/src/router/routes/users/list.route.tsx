import { createRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { rootRoute } from '../root.route';
import { requireSuperadmin } from '@/lib/route-guards';
import { apiClient } from '@/lib/api';
import { getApiError } from '@hecto/api-client';
import { AppLayout } from '@/components/layout/app-layout';
import { Pager } from '@/components/pager';
import { Alert, Badge, Card, CardContent, Input, PageHeader, Spinner } from '@hecto/ui';
import type { AdminUser, Paginated } from '@hecto/shared-types';
import { fmtDateTime } from '@/lib/date';

const PAGE_SIZE = 25;

export const usersListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users',
  beforeLoad: requireSuperadmin,
  component: UsersListPage,
});

function UsersListPage() {
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users', search, offset],
    queryFn: () =>
      apiClient
        .get<Paginated<AdminUser>>('/admin/users', {
          params: { limit: PAGE_SIZE, offset, ...(search ? { search } : {}) },
        })
        .then((r) => r.data),
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <PageHeader title="Users" description="All users across all organizations." />

        {error && <Alert variant="error">{getApiError(error)}</Alert>}

        <Input
          placeholder="Search by email, name or username..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
          className="max-w-xs"
        />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-2">
            {data?.items.map((user) => (
              <Card
                key={user.id}
                className="cursor-pointer transition-shadow hover:shadow-sm"
                onClick={() => navigate({ to: '/users/$id', params: { id: user.id } })}
              >
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
                      {user.organizationName ? ` · ${user.organizationName}` : ''}
                    </p>
                    <p className="text-xs text-gray-400">
                      Last login: {user.lastLogin ? fmtDateTime(user.lastLogin) : 'never'}
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
            ))}
            {data?.items.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-500">No users found.</p>
            )}
          </div>
        )}

        {data && (
          <Pager offset={offset} limit={PAGE_SIZE} total={data.total} onChange={setOffset} />
        )}
      </div>
    </AppLayout>
  );
}
