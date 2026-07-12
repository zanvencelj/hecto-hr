import { create } from 'zustand';
import { secureStorage } from '@/lib/secure-storage';

const TOKEN_KEY = 'kiosk_device_token';
const NAME_KEY = 'kiosk_device_name';
const ORG_KEY = 'kiosk_org_name';

interface DeviceState {
  hydrated: boolean;
  deviceToken: string | null;
  deviceName: string | null;
  organizationName: string | null;
  hydrate: () => Promise<void>;
  setDevice: (token: string, name: string, organizationName: string) => Promise<void>;
  clearDevice: () => Promise<void>;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  hydrated: false,
  deviceToken: null,
  deviceName: null,
  organizationName: null,

  hydrate: async () => {
    const [deviceToken, deviceName, organizationName] = await Promise.all([
      secureStorage.getItemAsync(TOKEN_KEY),
      secureStorage.getItemAsync(NAME_KEY),
      secureStorage.getItemAsync(ORG_KEY),
    ]);
    set({ hydrated: true, deviceToken, deviceName, organizationName });
  },

  setDevice: async (token, name, organizationName) => {
    await Promise.all([
      secureStorage.setItemAsync(TOKEN_KEY, token),
      secureStorage.setItemAsync(NAME_KEY, name),
      secureStorage.setItemAsync(ORG_KEY, organizationName),
    ]);
    set({ deviceToken: token, deviceName: name, organizationName });
  },

  clearDevice: async () => {
    await Promise.all([
      secureStorage.deleteItemAsync(TOKEN_KEY),
      secureStorage.deleteItemAsync(NAME_KEY),
      secureStorage.deleteItemAsync(ORG_KEY),
    ]);
    set({ deviceToken: null, deviceName: null, organizationName: null });
  },
}));
