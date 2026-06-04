import { createRoute, redirect } from '@tanstack/react-router';
import { rootRoute } from './root.route';
import { useAuthStore } from '@/stores/auth.store';
import { AppLayout } from '@/components/layout/app-layout';
import { PageHeader } from '@hecto/ui';
import { HistoryView } from '@/components/history/history-view';

export const myHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/my-history',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: '/auth/login' });
  },
  component: MyHistoryPage,
});

function MyHistoryPage() {
  const { user } = useAuthStore();

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <PageHeader title="My Work History" description="Your working times and events" />
        {user && (
          <HistoryView
            summaryEndpoint="/reports/my/summary"
            shiftsEndpoint={`/shifts/employee/${user.id}`}
            eventsEndpoint="/events/me"
          />
        )}
      </div>
    </AppLayout>
  );
}
