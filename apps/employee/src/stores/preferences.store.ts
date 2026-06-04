import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { WorkEventType } from '@hecto/shared-types';

const KEY = 'hecto_button_prefs';

export const DEFAULT_ORDER: WorkEventType[] = [
  'arrival',
  'remote_arrival',
  'departure',
  'break_start',
  'break_end',
  'business_trip_start',
  'business_trip_end',
];

interface PreferencesState {
  buttonOrder: WorkEventType[];
  hiddenButtons: WorkEventType[];
  setButtonOrder: (order: WorkEventType[]) => void;
  setHiddenButtons: (hidden: WorkEventType[]) => void;
  hydrate: () => Promise<void>;
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  buttonOrder: [...DEFAULT_ORDER],
  hiddenButtons: [],

  setButtonOrder: (order) => {
    set({ buttonOrder: order });
    void SecureStore.setItemAsync(KEY, JSON.stringify({ order, hidden: get().hiddenButtons }));
  },

  setHiddenButtons: (hidden) => {
    set({ hiddenButtons: hidden });
    void SecureStore.setItemAsync(KEY, JSON.stringify({ order: get().buttonOrder, hidden }));
  },

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (!raw) return;
      const { order, hidden } = JSON.parse(raw) as { order: WorkEventType[]; hidden: WorkEventType[] };
      if (Array.isArray(order)) set({ buttonOrder: order });
      if (Array.isArray(hidden)) set({ hiddenButtons: hidden });
    } catch {
      // ignore corrupt prefs
    }
  },
}));
