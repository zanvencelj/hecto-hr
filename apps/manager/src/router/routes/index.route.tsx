import { createRoute, redirect } from '@tanstack/react-router';
import { rootRoute } from './root.route';
import { useAuthStore } from '@/stores/auth.store';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, PageHeader } from '@hecto/ui';

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/auth/login' });
    }
  },
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <PageHeader
          title="Dashboard"
          description="Welcome back. Here's what's happening."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">More content coming soon.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
