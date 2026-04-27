import { z } from 'zod';
export const userRoleSchema = z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TECHNICIAN', 'VIEWER']);
export const updateUserRoleSchema = z.object({
  role: userRoleSchema,
});
