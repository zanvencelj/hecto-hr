import { describe, expect, it } from 'vitest';
import { visitSignInSchema, kioskPairSchema, kioskDeviceNameSchema } from './visit.schema';

describe('visitSignInSchema', () => {
  it('accepts a valid sign-in and trims whitespace', () => {
    const result = visitSignInSchema.parse({
      name: '  Jane Doe  ',
      purpose: ' Meeting with HR ',
    });
    expect(result).toEqual({ name: 'Jane Doe', purpose: 'Meeting with HR' });
  });

  it('rejects a too-short name', () => {
    expect(visitSignInSchema.safeParse({ name: 'J', purpose: 'Meeting' }).success).toBe(false);
  });

  it('rejects a missing purpose', () => {
    expect(visitSignInSchema.safeParse({ name: 'Jane Doe', purpose: '' }).success).toBe(false);
  });

  it('rejects an overlong purpose', () => {
    expect(
      visitSignInSchema.safeParse({ name: 'Jane Doe', purpose: 'x'.repeat(501) }).success,
    ).toBe(false);
  });
});

describe('kioskPairSchema', () => {
  it('accepts a 6-digit code', () => {
    expect(kioskPairSchema.safeParse({ code: '012345' }).success).toBe(true);
  });

  it('trims surrounding whitespace', () => {
    expect(kioskPairSchema.parse({ code: ' 123456 ' })).toEqual({ code: '123456' });
  });

  it.each(['12345', '1234567', 'abcdef', '12 456'])('rejects %s', (code) => {
    expect(kioskPairSchema.safeParse({ code }).success).toBe(false);
  });
});

describe('kioskDeviceNameSchema', () => {
  it('accepts a normal device name', () => {
    expect(kioskDeviceNameSchema.safeParse({ name: 'Front desk tablet' }).success).toBe(true);
  });

  it('rejects a one-character name', () => {
    expect(kioskDeviceNameSchema.safeParse({ name: 'x' }).success).toBe(false);
  });
});
