import { useEffect, useState } from 'react';

export interface AppLinks {
  androidApkUrl: string | null;
  iosDownloadUrl: string | null;
}

/** Fetches the current mobile download links (set from the admin app) at runtime. */
export function useAppLinks(): AppLinks {
  const [links, setLinks] = useState<AppLinks>({ androidApkUrl: null, iosDownloadUrl: null });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/app-links')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AppLinks | null) => {
        if (!cancelled && data) setLinks(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return links;
}
