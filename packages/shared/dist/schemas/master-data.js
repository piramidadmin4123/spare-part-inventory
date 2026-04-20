import { z } from 'zod';
export const createSiteSchema = z.object({
  code: z.string().min(1).max(20).toUpperCase(),
  name: z.string().min(1).max(100),
  description: z.string().max(255).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
});
export const updateSiteSchema = createSiteSchema.partial();
export const createEquipmentTypeSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  icon: z.string().max(10).optional().nullable(),
});
export const updateEquipmentTypeSchema = createEquipmentTypeSchema.partial();
export const createBrandSchema = z.object({
  name: z.string().min(1).max(100),
});
export const updateBrandSchema = createBrandSchema.partial();
