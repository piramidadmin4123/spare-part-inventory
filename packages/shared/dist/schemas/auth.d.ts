import { z } from 'zod';
export declare const loginSchema: z.ZodObject<
  {
    email: z.ZodString;
    password: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    email: string;
    password: string;
  },
  {
    email: string;
    password: string;
  }
>;
export type LoginInput = z.infer<typeof loginSchema>;
export declare const registerSchema: z.ZodObject<
  {
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    email: string;
    password: string;
    name: string;
    phone?: string | undefined;
  },
  {
    email: string;
    password: string;
    name: string;
    phone?: string | undefined;
  }
>;
export type RegisterInput = z.infer<typeof registerSchema>;
export declare const updateProfileSchema: z.ZodObject<
  {
    name: z.ZodOptional<z.ZodString>;
    phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    lineUserId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name?: string | undefined;
    phone?: string | null | undefined;
    lineUserId?: string | null | undefined;
  },
  {
    name?: string | undefined;
    phone?: string | null | undefined;
    lineUserId?: string | null | undefined;
  }
>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
