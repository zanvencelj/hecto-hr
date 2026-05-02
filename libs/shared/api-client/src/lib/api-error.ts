import type { AxiosError } from 'axios';

type ApiErrorBody = { message?: string | string[] };

export function getApiError(error: unknown): string {
  const axiosError = error as AxiosError<ApiErrorBody>;
  const message = axiosError?.response?.data?.message;
  if (Array.isArray(message)) return message[0] ?? 'An error occurred';
  if (typeof message === 'string') return message;
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}
