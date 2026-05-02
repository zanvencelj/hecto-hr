import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema } from './auth.schema';

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(loginSchema.safeParse({ email: 'user@example.com', password: 'secret' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'secret' }).success).toBe(false);
  });

  it('rejects empty password', () => {
    expect(loginSchema.safeParse({ email: 'user@example.com', password: '' }).success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'Password1',
      confirmPassword: 'Different1',
    });
    expect(result.success).toBe(false);
  });
});
