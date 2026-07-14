import { QueryClient } from '@tanstack/react-query';

function isNetworkError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Network Error';
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error) => {
        if (isNetworkError(error)) return failureCount < 2;
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
