import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

interface QueueEntry {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

export interface AuthInterceptorConfig {
  getAccessToken: () => string | null;
  onTokenRefreshed: (accessToken: string) => void;
  onAuthFailure: () => void;
  /** Mobile: supply stored refresh token to include in refresh request body (may be async) */
  getRefreshToken?: () => string | null | Promise<string | null>;
  refreshEndpoint?: string;
  /** Endpoints that should never trigger a token refresh retry on 401 */
  noRetryEndpoints?: string[];
}

export function setupAuthInterceptors(
  client: AxiosInstance,
  config: AuthInterceptorConfig,
): void {
  const {
    getAccessToken,
    onTokenRefreshed,
    onAuthFailure,
    getRefreshToken,
    refreshEndpoint = '/auth/refresh',
    noRetryEndpoints = ['/auth/logout', '/auth/logout-all'],
  } = config;

  let isRefreshing = false;
  const failedQueue: QueueEntry[] = [];

  function processQueue(error: unknown, token: string | null = null): void {
    failedQueue.splice(0).forEach(({ resolve, reject }) => {
      if (token !== null) resolve(token);
      else reject(error);
    });
  }

  client.interceptors.request.use(
    (req: InternalAxiosRequestConfig) => {
      const token = getAccessToken();
      if (token) {
        req.headers.Authorization = `Bearer ${token}`;
      }
      return req;
    },
    (error) => Promise.reject(error),
  );

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      if (error.response?.status !== 401 || original._retry) {
        return Promise.reject(error);
      }

      // Request carried no token → 401 is a legitimate auth rejection (wrong
      // credentials, unverified email, etc.), not an expired-token signal.
      // Pass the original error straight through without attempting a refresh.
      if (!original.headers.Authorization) {
        return Promise.reject(error);
      }

      // Refresh or explicit no-retry endpoints returned 401 — don't cycle
      const isNoRetry =
        original.url === refreshEndpoint ||
        noRetryEndpoints.some((ep) => original.url?.includes(ep));
      if (isNoRetry) {
        onAuthFailure();
        return Promise.reject(error);
      }

      // Another refresh is in flight — queue this request
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return client(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = (await getRefreshToken?.()) ?? null;
        const { data } = await client.post<{ accessToken: string }>(
          refreshEndpoint,
          refreshToken ? { refreshToken } : undefined,
        );
        onTokenRefreshed(data.accessToken);
        processQueue(null, data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return client(original);
      } catch (refreshError) {
        processQueue(refreshError);
        onAuthFailure();
        // Reject with the original 401 error so callers see their request's
        // error, not the unrelated "session not found" message from /refresh.
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    },
  );
}
