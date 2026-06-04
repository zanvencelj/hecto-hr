import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { UserPublic } from '@hecto/shared-types';

const REFRESH_TOKEN_KEY = 'hecto_refresh_token';
const USER_KEY = 'hecto_user';

interface AuthState {
  user: UserPublic | null;
  accessToken: string | null;
  isHydrated: boolean;
  setAuth: (user: UserPublic, accessToken: string, refreshToken: string) => Promise<void>;
  setAccessToken: (token: string) => void;
  clearAuth: () => Promise<void>;
  getRefreshToken: () => Promise<string | null>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isHydrated: false,

  setAuth: async (user, accessToken, refreshToken) => {
    await Promise.all([
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
    set({ user, accessToken });
  },

  setAccessToken: (token) => set({ accessToken: token }),

  clearAuth: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    set({ user: null, accessToken: null });
  },

  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),

  hydrate: async () => {
    const [storedToken, storedUser] = await Promise.all([
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);

    if (storedToken && storedUser) {
      try {
        const { api } = await import('../lib/api');
        const { data } = await api.post<{ accessToken: string }>('/auth/refresh', {
          refreshToken: storedToken,
        });
        const user = JSON.parse(storedUser) as UserPublic;
        set({ accessToken: data.accessToken, user });
      } catch {
        await Promise.all([
          SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
          SecureStore.deleteItemAsync(USER_KEY),
        ]);
      }
    }

    set({ isHydrated: true });
  },
}));
