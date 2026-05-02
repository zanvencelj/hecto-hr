import axios from 'axios';
import type { AxiosInstance, CreateAxiosDefaults } from 'axios';

export function createHttpClient(
  baseURL: string,
  defaults?: CreateAxiosDefaults,
): AxiosInstance {
  return axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 30_000,
    withCredentials: true,
    ...defaults,
  });
}
