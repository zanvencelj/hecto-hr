import { z } from 'zod';

export const visitSignInSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(200, 'Name is too long'),
  purpose: z
    .string()
    .trim()
    .min(2, 'Purpose must be at least 2 characters')
    .max(500, 'Purpose is too long'),
});

export type VisitSignInInput = z.infer<typeof visitSignInSchema>;

export const kioskPairSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Pairing code is 6 digits'),
});

export type KioskPairInput = z.infer<typeof kioskPairSchema>;

export const kioskDeviceNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Device name must be at least 2 characters')
    .max(150, 'Device name is too long'),
});

export type KioskDeviceNameInput = z.infer<typeof kioskDeviceNameSchema>;
