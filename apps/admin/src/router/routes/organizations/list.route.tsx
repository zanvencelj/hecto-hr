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
import type { AdminOrganization, Paginated } from '@hecto/shared-types';
import { fmtDate } from '@/lib/date';

const PAGE_SIZE = 25;

export const organizationsListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/organizations',
  beforeLoad: requireSuperadmin,
  component: OrganizationsListPage,
});

function OrganizationsListPage() {
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-organizations', search, offset],
    queryFn: () =>
      apiClient
        .get<Paginated<AdminOrganization>>('/admin/organizations', {
          params: { limit: PAGE_SIZE, offset, ...(search ? { search } : {}) },
        })
        .then((r) => r.data),
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <PageHeader title="Organizations" description="All organizations on the platform." />

        {error && <Alert variant="error">{getApiError(error)}</Alert>}

        <Input
          placeholder="Search by name or slug..."
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
            {data?.items.map((org) => (
              <Card
                key={org.id}
                className="cursor-pointer transition-shadow hover:shadow-sm"
                onClick={() => navigate({ to: '/organizations/$id', params: { id: org.id } })}
              >
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{org.name}</p>
                    <p className="text-xs text-gray-500">
                      /{org.slug} · {org.userCount} user{org.userCount === 1 ? '' : 's'} · created{' '}
                      {fmtDate(org.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {org.deletedAt ? (
                      <Badge variant="destructive">Deleted</Badge>
                    ) : org.isActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="warning">Disabled</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {data?.items.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-500">No organizations found.</p>
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
