import { createRoute, redirect } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { rootRoute } from './root.route';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api';
import { getApiError } from '@hecto/api-client';
import { AppLayout } from '@/components/layout/app-layout';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  Input,
  PageHeader,
  Spinner,
  useToast,
} from '@hecto/ui';
import type { KioskDevicePublic, KioskPairingCodeResponse } from '@hecto/shared-types';

export const kioskDevicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/kiosk-devices',
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: '/auth/login' });
    if (user?.role !== 'admin') throw redirect({ to: '/' });
  },
  component: KioskDevicesPage,
});

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function KioskDevicesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [pairOpen, setPairOpen] = useState(false);
  const [renaming, setRenaming] = useState<KioskDevicePublic | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<KioskDevicePublic | null>(null);

  const { data: devices = [], isLoading, error } = useQuery({
    queryKey: ['kiosk-devices'],
    queryFn: () => apiClient.get<KioskDevicePublic[]>('/kiosk-devices').then((r) => r.data),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.post<KioskDevicePublic>(`/kiosk-devices/${id}/revoke`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kiosk-devices'] });
      setConfirmRevoke(null);
      toast('Device revoked', 'success');
    },
    onError: (err) => toast(getApiError(err) ?? 'Failed to revoke device', 'error'),
  });

  const active = devices.filter((d) => d.revokedAt === null);
  const revoked = devices.filter((d) => d.revokedAt !== null);

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <PageHeader
          title="Kiosk Devices"
          action={<Button onClick={() => setPairOpen(true)}>Pair device</Button>}
        />

        {isLoading && <Spinner />}
        {error && <Alert variant="error">{getApiError(error) ?? 'Failed to load'}</Alert>}

        {!isLoading && active.length === 0 && (
          <p className="text-sm text-gray-500">
            No kiosk devices paired yet. Pair a tablet to start signing in visitors.
          </p>
        )}

        <div className="space-y-3">
          {active.map((device) => (
            <Card key={device.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium text-gray-900">{device.name}</p>
                  <p className="text-xs text-gray-500">
                    Paired: {formatDateTime(device.createdAt)} · Last seen:{' '}
                    {formatDateTime(device.lastSeenAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setRenaming(device)}>
                    Rename
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmRevoke(device)}
                  >
                    Revoke
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {revoked.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-gray-500">Revoked</h2>
            {revoked.map((device) => (
              <Card key={device.id}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-gray-500">{device.name}</p>
                      <Badge variant="destructive">Revoked</Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      Revoked: {formatDateTime(device.revokedAt)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {pairOpen && <PairDeviceDialog onClose={() => setPairOpen(false)} />}
      {renaming && <RenameDeviceDialog device={renaming} onClose={() => setRenaming(null)} />}

      <Dialog
        open={confirmRevoke !== null}
        onClose={() => setConfirmRevoke(null)}
        title="Revoke device"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Revoke <span className="font-medium">{confirmRevoke?.name}</span>? The tablet will
            immediately lose access and return to its pairing screen. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmRevoke(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              loading={revokeMutation.isPending}
              onClick={() => confirmRevoke && revokeMutation.mutate(confirmRevoke.id)}
            >
              Revoke
            </Button>
          </div>
        </div>
      </Dialog>
    </AppLayout>
  );
}

function PairDeviceDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [deviceName, setDeviceName] = useState('');
  const [pairing, setPairing] = useState<KioskPairingCodeResponse | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!pairing) return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.round((new Date(pairing.expiresAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [pairing]);

  const createCodeMutation = useMutation({
    mutationFn: () =>
      apiClient
        .post<KioskPairingCodeResponse>('/kiosk-devices/pairing-codes', { deviceName })
        .then((r) => r.data),
    onSuccess: setPairing,
    onError: (err) => toast(getApiError(err) ?? 'Failed to create pairing code', 'error'),
  });

  return (
    <Dialog open onClose={onClose} title="Pair kiosk device">
      {pairing ? (
        <div className="space-y-4 text-center p-6">
          <p className="text-sm text-gray-600">
            Enter this code on the tablet's pairing screen:
          </p>
          <p className="font-mono text-4xl font-bold tracking-[0.5em] text-gray-900">
            {pairing.code}
          </p>
          <p className="text-sm text-gray-500">
            {secondsLeft > 0
              ? `Expires in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`
              : 'Code expired — generate a new one.'}
          </p>
          <div className="flex justify-end gap-2">
            {secondsLeft === 0 && (
              <Button
                size="sm"
                onClick={() => createCodeMutation.mutate()}
                loading={createCodeMutation.isPending}
              >
                New code
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            createCodeMutation.mutate();
          }}
        >
          <label className="block space-y-1 text-sm text-gray-600">
            Device name
            <Input
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. Front desk tablet"
              minLength={2}
              maxLength={150}
              required
              autoFocus
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={createCodeMutation.isPending}>
              Generate code
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function RenameDeviceDialog({
  device,
  onClose,
}: {
  device: KioskDevicePublic;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(device.name);

  const renameMutation = useMutation({
    mutationFn: () =>
      apiClient
        .patch<KioskDevicePublic>(`/kiosk-devices/${device.id}`, { name })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kiosk-devices'] });
      toast('Device renamed', 'success');
      onClose();
    },
    onError: (err) => toast(getApiError(err) ?? 'Failed to rename device', 'error'),
  });

  return (
    <Dialog open onClose={onClose} title="Rename device">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          renameMutation.mutate();
        }}
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={150}
          required
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={renameMutation.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
