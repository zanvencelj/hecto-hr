import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * expo-secure-store has no real web implementation (its ExpoSecureStore.web.js
 * is an empty stub), so every method throws "is not a function" on web. This
 * falls back to localStorage there. localStorage is NOT encrypted at rest and
 * is readable by any XSS on the page — acceptable for local dev convenience,
 * not a substitute for the native secure keystore if web is ever shipped for
 * real users.
 */
export const secureStorage = {
  getItemAsync: (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return Promise.resolve(window.localStorage.getItem(key));
    }
    return SecureStore.getItemAsync(key);
  },

  setItemAsync: (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      window.localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },

  deleteItemAsync: (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      window.localStorage.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};
