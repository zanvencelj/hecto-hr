import { z } from 'zod';

export const userPublicSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  isActive: z.boolean(),
  isSuperuser: z.boolean(),
  isStaff: z.boolean(),
  dateJoined: z.string().datetime(),
  lastLogin: z.string().datetime().nullable(),
});

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-z0-9_-]+$/, 'Only lowercase letters, numbers, _ and - allowed')
    .optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
});

export type UserPublicSchema = z.infer<typeof userPublicSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
