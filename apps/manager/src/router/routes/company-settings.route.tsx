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
  Button,
  Card,
  CardContent,
  FormField,
  Input,
  PageHeader,
  Skeleton,
  useToast,
  cn,
} from '@hecto/ui';
import type { CompanySettingsPublic } from '@hecto/shared-types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const companySettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/company-settings',
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: '/auth/login' });
    if (user?.role !== 'admin' && user?.role !== 'hr') throw redirect({ to: '/' });
  },
  component: CompanySettingsPage,
});

function CompanySettingsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState<CompanySettingsPublic | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => apiClient.get<CompanySettingsPublic>('/company-settings').then((r) => r.data),
  });

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  const save = useMutation({
    mutationFn: () =>
      apiClient.put<CompanySettingsPublic>('/company-settings', {
        name: form!.name,
        weekendDays: form!.weekendDays,
        unpaidBreakThresholdMinutes: form!.unpaidBreakThresholdMinutes,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['company-settings'] });
      setForm(res.data);
      toast('Company settings saved');
    },
    onError: (err) => toast(getApiError(err), 'error'),
  });

  function toggleWeekendDay(day: number) {
    setForm((f) => {
      if (!f) return f;
      const weekendDays = f.weekendDays.includes(day)
        ? f.weekendDays.filter((d) => d !== day)
        : [...f.weekendDays, day];
      return { ...f, weekendDays };
    });
  }

  if (isLoading || !form) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-2xl space-y-6 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(settings);

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <PageHeader
          title="Company Settings"
          description="Settings that apply across your whole organization."
        />

        {save.error && <Alert variant="error">{getApiError(save.error)}</Alert>}

        <Card>
          <CardContent className="space-y-4 pt-4">
            <h3 className="text-sm font-semibold text-gray-900">Company Profile</h3>
            <FormField label="Company name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Work Week</h3>
              <p className="text-xs text-gray-500">
                Days selected here are treated as non-working days when counting leave days.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleWeekendDay(i)}
                  className={cn(
                    'rounded px-3 py-1.5 text-xs font-medium transition-colors',
                    form.weekendDays.includes(i)
                      ? 'bg-gray-700 text-white'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">Dark = non-working day. Light = working day.</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Attendance</h3>
              <p className="text-xs text-gray-500">
                Unpaid break minutes — the first N minutes of daily breaks are treated as paid;
                anything beyond that is deducted from worked time.
              </p>
            </div>
            <FormField label="Unpaid break threshold (minutes)">
              <Input
                type="number"
                min={0}
                max={240}
                value={form.unpaidBreakThresholdMinutes}
                onChange={(e) =>
                  setForm({ ...form, unpaidBreakThresholdMinutes: Number(e.target.value) })
                }
              />
            </FormField>
          </CardContent>
        </Card>

        <Button size="sm" onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty}>
          Save changes
        </Button>
      </div>
    </AppLayout>
  );
}
