import { createRouter } from '@tanstack/react-router';
import { queryClient } from '@/lib/query-client';
import { rootRoute } from './routes/root.route';
import { indexRoute } from './routes/index.route';
import { authLayoutRoute } from './routes/auth/layout.route';
import { loginRoute } from './routes/auth/login.route';
import { organizationsListRoute } from './routes/organizations/list.route';
import { organizationDetailRoute } from './routes/organizations/detail.route';
import { usersListRoute } from './routes/users/list.route';
import { userDetailRoute } from './routes/users/detail.route';
import { auditLogsRoute } from './routes/audit-logs.route';
import { appLinksRoute } from './routes/app-links.route';

const routeTree = rootRoute.addChildren([
  indexRoute,
  organizationsListRoute,
  organizationDetailRoute,
  usersListRoute,
  userDetailRoute,
  auditLogsRoute,
  appLinksRoute,
  authLayoutRoute.addChildren([loginRoute]),
]);

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
