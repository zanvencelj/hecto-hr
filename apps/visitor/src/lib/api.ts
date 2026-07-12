import { createHttpClient } from '@hecto/api-client';
import { useDeviceStore } from '@/stores/device.store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export const api = createHttpClient(BASE_URL, {
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = useDeviceStore.getState().deviceToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 means the device was revoked (or the token is gone) — unpair and
// let the pairing screen take over.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status: number | undefined = error?.response?.status;
    const isPairAttempt = error?.config?.url?.includes('/kiosk/pair');
    if (status === 401 && !isPairAttempt) {
      void useDeviceStore.getState().clearDevice();
    }
    return Promise.reject(error);
  },
);
