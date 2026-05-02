import { createRouter } from '@tanstack/react-router';
import { queryClient } from '@/lib/query-client';
import { rootRoute } from './routes/root.route';
import { indexRoute } from './routes/index.route';
import { authLayoutRoute } from './routes/auth/layout.route';
import { loginRoute } from './routes/auth/login.route';
import { registerRoute } from './routes/auth/register.route';
import { sessionsRoute } from './routes/sessions.route';

const routeTree = rootRoute.addChildren([
  indexRoute,
  sessionsRoute,
  authLayoutRoute.addChildren([loginRoute, registerRoute]),
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
