import { z } from 'zod';
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
});
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  lineUserId: z.string().optional().nullable(),
});
