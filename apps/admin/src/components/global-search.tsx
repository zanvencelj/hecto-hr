import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Input } from '@hecto/ui';
import type { AdminOrganization, AdminUser, Paginated } from '@hecto/shared-types';

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function GlobalSearch() {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(term.trim(), 250);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const enabled = debounced.length >= 2;

  const { data: orgs } = useQuery({
    queryKey: ['global-search', 'organizations', debounced],
    queryFn: () =>
      apiClient
        .get<Paginated<AdminOrganization>>('/admin/organizations', {
          params: { search: debounced, limit: 5 },
        })
        .then((r) => r.data.items),
    enabled,
  });

  const { data: users } = useQuery({
    queryKey: ['global-search', 'users', debounced],
    queryFn: () =>
      apiClient
        .get<Paginated<AdminUser>>('/admin/users', {
          params: { search: debounced, limit: 5 },
        })
        .then((r) => r.data.items),
    enabled,
  });

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function go(to: string, id: string) {
    setOpen(false);
    setTerm('');
    navigate({ to, params: { id } });
  }

  const hasResults = (orgs?.length ?? 0) > 0 || (users?.length ?? 0) > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Input
        placeholder="Search organizations and users..."
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && enabled && (
        <div className="absolute top-full z-20 mt-1 w-full border border-gray-200 bg-white shadow-lg">
          {!hasResults && (
            <p className="px-3 py-2 text-sm text-gray-500">No matches.</p>
          )}
          {(orgs?.length ?? 0) > 0 && (
            <div>
              <p className="border-b border-gray-100 bg-gray-50 px-3 py-1 text-xs font-medium uppercase text-gray-400">
                Organizations
              </p>
              {orgs?.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => go('/organizations/$id', org.id)}
                >
                  <span className="font-medium text-gray-900">{org.name}</span>{' '}
                  <span className="text-gray-400">/{org.slug}</span>
                </button>
              ))}
            </div>
          )}
          {(users?.length ?? 0) > 0 && (
            <div>
              <p className="border-b border-gray-100 bg-gray-50 px-3 py-1 text-xs font-medium uppercase text-gray-400">
                Users
              </p>
              {users?.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => go('/users/$id', user.id)}
                >
                  <span className="font-medium text-gray-900">{user.email}</span>{' '}
                  {user.organizationName && (
                    <span className="text-gray-400">· {user.organizationName}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
