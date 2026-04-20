import { z } from 'zod';
export declare const createSiteSchema: z.ZodObject<
  {
    code: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    address: z.ZodNullable<z.ZodOptional<z.ZodString>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    code: string;
    name: string;
    description?: string | null | undefined;
    address?: string | null | undefined;
  },
  {
    code: string;
    name: string;
    description?: string | null | undefined;
    address?: string | null | undefined;
  }
>;
export declare const updateSiteSchema: z.ZodObject<
  {
    code: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    address: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    code?: string | undefined;
    name?: string | undefined;
    description?: string | null | undefined;
    address?: string | null | undefined;
  },
  {
    code?: string | undefined;
    name?: string | undefined;
    description?: string | null | undefined;
    address?: string | null | undefined;
  }
>;
export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;
export declare const createEquipmentTypeSchema: z.ZodObject<
  {
    code: z.ZodString;
    name: z.ZodString;
    category: z.ZodString;
    icon: z.ZodNullable<z.ZodOptional<z.ZodString>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    code: string;
    name: string;
    category: string;
    icon?: string | null | undefined;
  },
  {
    code: string;
    name: string;
    category: string;
    icon?: string | null | undefined;
  }
>;
export declare const updateEquipmentTypeSchema: z.ZodObject<
  {
    code: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    code?: string | undefined;
    name?: string | undefined;
    category?: string | undefined;
    icon?: string | null | undefined;
  },
  {
    code?: string | undefined;
    name?: string | undefined;
    category?: string | undefined;
    icon?: string | null | undefined;
  }
>;
export type CreateEquipmentTypeInput = z.infer<typeof createEquipmentTypeSchema>;
export type UpdateEquipmentTypeInput = z.infer<typeof updateEquipmentTypeSchema>;
export declare const createBrandSchema: z.ZodObject<
  {
    name: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string;
  },
  {
    name: string;
  }
>;
export declare const updateBrandSchema: z.ZodObject<
  {
    name: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name?: string | undefined;
  },
  {
    name?: string | undefined;
  }
>;
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
