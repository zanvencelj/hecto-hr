import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { getApiError } from '@hecto/api-client';
import { Alert, Spinner } from '@hecto/ui';
import { Pager } from '@/components/pager';
import type { AdminOrgEntityType, Paginated } from '@hecto/shared-types';
import { fmtDateTime } from '@/lib/date';

const PAGE_SIZE = 25;

/** Generic read-only table over an org-scoped entity endpoint. */
export function EntityTable({
  orgId,
  entityType,
}: {
  orgId: string;
  entityType: AdminOrgEntityType;
}) {
  const [offset, setOffset] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-org-entities', orgId, entityType, offset],
    queryFn: () =>
      apiClient
        .get<Paginated<Record<string, unknown>>>(
          `/admin/organizations/${orgId}/entities/${entityType}`,
          { params: { limit: PAGE_SIZE, offset } },
        )
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
    return <p className="py-8 text-center text-sm text-gray-500">No records.</p>;
  }

  const columns = Object.keys(data.items[0] ?? {});

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.items.map((row, i) => (
              <tr key={String(row['id'] ?? i)} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col} className="whitespace-nowrap px-3 py-2 text-gray-700">
                    {formatCell(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager offset={offset} limit={PAGE_SIZE} total={data.total} onChange={setOffset} />
    </div>
  );
}

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function formatCell(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'string' && ISO_DATE_TIME.test(value)) return fmtDateTime(value);
  if (typeof value === 'object') return JSON.stringify(value);
  const text = String(value);
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}
