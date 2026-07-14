import { redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth.store';

/** Every admin page requires an authenticated superadmin. */
export function requireSuperadmin(): void {
  const { isAuthenticated, user } = useAuthStore.getState();
  if (!isAuthenticated) throw redirect({ to: '/auth/login' });
  if (user?.role !== 'superadmin') {
    useAuthStore.getState().clearAuth();
    throw redirect({ to: '/auth/login' });
  }
}
