import { z } from 'zod';
export declare const userRoleSchema: z.ZodEnum<
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TECHNICIAN', 'VIEWER']
>;
export declare const updateUserRoleSchema: z.ZodObject<
  {
    role: z.ZodEnum<['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TECHNICIAN', 'VIEWER']>;
  },
  'strip',
  z.ZodTypeAny,
  {
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'VIEWER';
  },
  {
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'VIEWER';
  }
>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
