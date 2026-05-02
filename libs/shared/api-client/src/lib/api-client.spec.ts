import { describe, it, expect } from 'vitest';
import { createHttpClient } from './http-client';

describe('createHttpClient', () => {
  it('creates an axios instance with the given baseURL', () => {
    const client = createHttpClient('https://api.example.com');
    expect(client.defaults.baseURL).toBe('https://api.example.com');
  });

  it('sets the default Content-Type header', () => {
    const client = createHttpClient('https://api.example.com');
    expect(client.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('sets the default timeout', () => {
    const client = createHttpClient('https://api.example.com');
    expect(client.defaults.timeout).toBe(30_000);
  });
});
