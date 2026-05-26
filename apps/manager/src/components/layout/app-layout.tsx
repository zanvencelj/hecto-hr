import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api';
import { Avatar, Button, cn } from '@hecto/ui';

interface NavItem {
  to: string;
  label: string;
}

function useNavItems(): NavItem[] {
  const { user } = useAuthStore();
  const role = user?.role;

  if (role === 'admin' || role === 'hr' || role === 'manager') {
    return [
      { to: '/employees', label: 'Employees' },
      { to: '/schedule', label: 'Schedule' },
      { to: '/leave', label: 'Leave' },
    ];
  }
  return [
    { to: '/my-schedule', label: 'My Schedule' },
    { to: '/my-leave', label: 'My Leave' },
  ];
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const navItems = useNavItems();

  async function handleLogout() {
    try {
      await apiClient.post('/auth/logout');
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
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold text-gray-900">
              HectoHR
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {navItems.map((item) => (
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

          <div className="flex items-center gap-3">
            {user && (
              <>
                <Link to="/sessions">
                  <Avatar
                    name={displayName}
                    size="sm"
                    className="cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 transition-shadow"
                  />
                </Link>
                <Link
                  to="/sessions"
                  className="hidden text-sm text-gray-600 hover:text-gray-900 sm:block"
                >
                  {displayName}
                </Link>
              </>
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
