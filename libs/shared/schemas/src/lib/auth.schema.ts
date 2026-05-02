import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const optionalName = z
  .string()
  .trim()
  .max(150, 'Name is too long')
  .optional()
  .transform((v) => v || undefined);

export const registerSchema = z
  .object({
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    firstName: optionalName,
    lastName: optionalName,
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterFormInput = z.input<typeof registerSchema>;
