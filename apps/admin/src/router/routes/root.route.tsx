import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import type { RefreshResponse } from '@hecto/shared-types';

export interface RouterContext {
  queryClient: QueryClient;
}

function RootLayout() {
  return <Outlet />;
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="text-gray-500">Page not found.</p>
      <a href="/" className="text-blue-600 underline">
        Go home
      </a>
    </div>
  );
}

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    const { user, isAuthenticated } = useAuthStore.getState();

    // Silently refresh the access token on cold start if a user profile is cached
    if (user && !isAuthenticated) {
      try {
        const { data } = await apiClient.post<RefreshResponse>('/auth/refresh');
        useAuthStore.getState().refreshAuth(data.accessToken);
      } catch {
        useAuthStore.getState().clearAuth();
      }
    }
  },
  component: RootLayout,
  notFoundComponent: NotFound,
});
