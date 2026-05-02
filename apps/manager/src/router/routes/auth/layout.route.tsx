import { createRoute, redirect, Outlet } from '@tanstack/react-router';
import { rootRoute } from '../root.route';
import { useAuthStore } from '@/stores/auth.store';
import { AuthLayout } from '@/components/layout/auth-layout';

export const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'auth-layout',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      throw redirect({ to: '/' });
    }
  },
  component: () => (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  ),
});
