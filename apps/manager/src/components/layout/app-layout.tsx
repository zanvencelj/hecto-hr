import { Link, useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api';
import { Avatar, Button } from '@hecto/ui';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore — cookies are cleared server-side regardless
    } finally {
      clearAuth();
      navigate({ to: '/auth/login' });
    }
  }

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName ?? user?.email ?? undefined;

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold text-gray-900">
              Manager
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <>
                <Link to="/sessions">
                  <Avatar name={displayName} size="sm" className="cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 transition-shadow" />
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
