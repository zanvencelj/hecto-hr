import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { UserPublic } from '@hecto/shared-types';

interface AuthState {
  user: UserPublic | null;
  /** In-memory only — never persisted to localStorage */
  accessToken: string | null;
  isAuthenticated: boolean;

  /** Called after a successful login */
  setAuth: (user: UserPublic, accessToken: string) => void;
  /** Called after a silent token refresh — keeps existing user */
  refreshAuth: (accessToken: string) => void;
  /** Clears all auth state (logout) */
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        accessToken: null,
        isAuthenticated: false,

        setAuth: (user, accessToken) =>
          set(
            { user, accessToken, isAuthenticated: true },
            false,
            'auth/setAuth',
          ),

        refreshAuth: (accessToken) =>
          set(
            { accessToken, isAuthenticated: true },
            false,
            'auth/refreshAuth',
          ),

        clearAuth: () =>
          set(
            { user: null, accessToken: null, isAuthenticated: false },
            false,
            'auth/clearAuth',
          ),
      }),
      {
        name: 'hecto-manager-auth',
        // Only persist the user profile; tokens live in memory only
        partialize: ({ user }) => ({ user }),
        merge: (persisted, current) => ({
          ...current,
          ...(persisted as Partial<AuthState>),
          accessToken: null,
          isAuthenticated: false,
        }),
      },
    ),
    { name: 'AuthStore' },
  ),
);
