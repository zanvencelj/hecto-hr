import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api';
import { Button, cn } from '@hecto/ui';
import { GlobalSearch } from '@/components/global-search';

const NAV_ITEMS = [
  { to: '/organizations', label: 'Organizations' },
  { to: '/users', label: 'Users' },
  { to: '/audit-logs', label: 'Audit Log' },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const routerState = useRouterState();

  async function handleLogout() {
    try {
      await apiClient.post('/admin/auth/logout');
    } catch {
      // server clears cookies regardless
    } finally {
      clearAuth();
      navigate({ to: '/auth/login' });
    }
  }

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName ?? user?.email ?? undefined;

  const currentPath = routerState.location.pathname;

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-amber-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold text-gray-900">
              Hecto <span className="text-amber-600">Admin</span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium transition-colors',
                    currentPath.startsWith(item.to)
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="hidden flex-1 justify-center md:flex">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-3">
            {displayName && (
              <span className="hidden text-sm text-gray-600 sm:block">{displayName}</span>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
