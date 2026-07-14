import { createRoute, redirect } from '@tanstack/react-router';
import { rootRoute } from './root.route';
import { useAuthStore } from '@/stores/auth.store';

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/auth/login' });
    }
    throw redirect({ to: '/organizations' });
  },
});
