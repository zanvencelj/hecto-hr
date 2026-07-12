import { createHttpClient, setupAuthInterceptors } from '@hecto/api-client';
import { useAuthStore } from '@/stores/auth.store';

export const apiClient = createHttpClient('/api');

setupAuthInterceptors(apiClient, {
  getAccessToken: () => useAuthStore.getState().accessToken,
  onTokenRefreshed: (token) => useAuthStore.getState().refreshAuth(token),
  onAuthFailure: () => useAuthStore.getState().clearAuth(),
});
