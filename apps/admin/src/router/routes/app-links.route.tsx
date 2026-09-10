import { createRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { rootRoute } from './root.route';
import { requireSuperadmin } from '@/lib/route-guards';
import { apiClient } from '@/lib/api';
import { getApiError } from '@hecto/api-client';
import { AppLayout } from '@/components/layout/app-layout';
import { Alert, Button, Card, CardContent, Input, PageHeader, Spinner, useToast } from '@hecto/ui';
import type { AppLinks } from '@hecto/shared-types';

export const appLinksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app-links',
  beforeLoad: requireSuperadmin,
  component: AppLinksPage,
});

function AppLinksPage() {
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-app-links'],
    queryFn: () => apiClient.get<AppLinks>('/admin/app-links').then((r) => r.data),
  });

  const [androidUrl, setAndroidUrl] = useState('');
  const [iosUrl, setIosUrl] = useState('');

  useEffect(() => {
    if (data) {
      setAndroidUrl(data.androidApkUrl ?? '');
      setIosUrl(data.iosDownloadUrl ?? '');
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      apiClient.patch<AppLinks>('/admin/app-links', {
        androidApkUrl: androidUrl || null,
        iosDownloadUrl: iosUrl || null,
      }),
    onSuccess: () => {
      toast('App links updated');
      qc.invalidateQueries({ queryKey: ['admin-app-links'] });
    },
  });

  const dirty = data && (androidUrl !== (data.androidApkUrl ?? '') || iosUrl !== (data.iosDownloadUrl ?? ''));

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <PageHeader
          title="Mobile App Links"
          description="Shown on the landing page's download section. Update these after publishing a new EAS build — no redeploy needed."
        />

        {error && <Alert variant="error">{getApiError(error)}</Alert>}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <Card>
            <CardContent className="space-y-4 pt-4">
              {save.error && <Alert variant="error">{getApiError(save.error)}</Alert>}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Android APK download URL
                </label>
                <Input
                  value={androidUrl}
                  onChange={(e) => setAndroidUrl(e.target.value)}
                  placeholder="https://expo.dev/artifacts/eas/..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  iOS download URL (TestFlight)
                </label>
                <Input
                  value={iosUrl}
                  onChange={(e) => setIosUrl(e.target.value)}
                  placeholder="https://testflight.apple.com/join/..."
                />
              </div>
              <Button size="sm" onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty}>
                Save changes
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
