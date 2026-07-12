import { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useDeviceStore } from '@/stores/device.store';

const IDLE_TIMEOUT_MS = 60_000;

/**
 * Returns any non-home screen to the home screen after 60s without touches,
 * so an abandoned kiosk never sits on a half-filled form.
 */
export function IdleReset({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const { deviceToken } = useDeviceStore.getState();
      if (deviceToken && pathnameRef.current !== '/') {
        router.replace('/');
      }
    }, IDLE_TIMEOUT_MS);
  }, [router]);

  useEffect(() => {
    reset();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [reset, pathname]);

  return (
    <View
      className="flex-1"
      onStartShouldSetResponderCapture={() => {
        reset();
        return false;
      }}
      onMoveShouldSetResponderCapture={() => {
        reset();
        return false;
      }}
    >
      {children}
    </View>
  );
}
