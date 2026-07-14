import { createRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { rootRoute } from './root.route';
import { requireSuperadmin } from '@/lib/route-guards';
import { apiClient } from '@/lib/api';
import { getApiError } from '@hecto/api-client';
import { AppLayout } from '@/components/layout/app-layout';
import { Pager } from '@/components/pager';
import { Alert, Badge, Card, CardContent, PageHeader, Spinner } from '@hecto/ui';
import type { AdminAuditLogEntry, Paginated } from '@hecto/shared-types';
import { fmtDateTime } from '@/lib/date';

const PAGE_SIZE = 50;

export const auditLogsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/audit-logs',
  beforeLoad: requireSuperadmin,
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const [offset, setOffset] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-audit-logs', offset],
    queryFn: () =>
      apiClient
        .get<Paginated<AdminAuditLogEntry>>('/admin/audit-logs', {
          params: { limit: PAGE_SIZE, offset },
        })
        .then((r) => r.data),
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <PageHeader
          title="Audit Log"
          description="Every mutation performed through the admin panel."
        />

        {error && <Alert variant="error">{getApiError(error)}</Alert>}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-2">
            {data?.items.map((entry) => (
              <AuditLogRow key={entry.id} entry={entry} />
            ))}
            {data?.items.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-500">No audit entries yet.</p>
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

function AuditLogRow({ entry }: { entry: AdminAuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasDiff = entry.before != null || entry.after != null;

  return (
    <Card
      className={hasDiff ? 'cursor-pointer transition-shadow hover:shadow-sm' : undefined}
      onClick={hasDiff ? () => setExpanded((v) => !v) : undefined}
    >
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">
              <Badge variant="secondary" className="mr-2">
                {entry.action}
              </Badge>
              {entry.entityType} <span className="font-mono text-xs text-gray-400">{entry.entityId}</span>
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              by {entry.adminEmail ?? entry.adminUserId} · {fmtDateTime(entry.createdAt)}
            </p>
          </div>
          {hasDiff && (
            <span className="text-xs text-gray-400">{expanded ? 'Hide' : 'Show'} diff</span>
          )}
        </div>
        {expanded && hasDiff && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-gray-400">Before</p>
              <pre className="overflow-x-auto bg-gray-50 p-2 text-xs text-gray-700">
                {JSON.stringify(entry.before, null, 2) ?? 'null'}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-gray-400">After</p>
              <pre className="overflow-x-auto bg-gray-50 p-2 text-xs text-gray-700">
                {JSON.stringify(entry.after, null, 2) ?? 'null'}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
