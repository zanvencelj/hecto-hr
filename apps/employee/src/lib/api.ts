import { createHttpClient, setupAuthInterceptors } from '@hecto/api-client';
import { useAuthStore } from '../stores/auth.store';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export const api = createHttpClient(BASE_URL, {
  withCredentials: false,
});

setupAuthInterceptors(api, {
  getAccessToken: () => useAuthStore.getState().accessToken,
  onTokenRefreshed: (token) => useAuthStore.getState().setAccessToken(token),
  onAuthFailure: () => {
    void useAuthStore.getState().clearAuth();
  },
  getRefreshToken: () => useAuthStore.getState().getRefreshToken(),
});
