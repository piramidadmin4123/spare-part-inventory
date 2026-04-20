import { z } from 'zod';
export const createSparePartSchema = z.object({
  siteId: z.string().uuid(),
  equipmentTypeId: z.string().uuid(),
  brandId: z.string().uuid(),
  materialCode: z.string().max(50).optional().nullable(),
  modelCode: z.string().min(1).max(100),
  productName: z.string().min(1),
  serialNumber: z.string().max(100).optional().nullable(),
  macAddress: z
    .string()
    .regex(/^([0-9A-Fa-f]{2}[:\-.]){5}[0-9A-Fa-f]{2}$/, 'Invalid MAC address')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  quantity: z.number().int().min(0).default(1),
  minStock: z.number().int().min(0).default(1),
  cost: z.number().nonnegative().optional().nullable(),
  status: z.enum(['IN_SERVICE', 'BORROWED', 'IN_STOCK', 'MAINTENANCE', 'LOST', 'DECOMMISSIONED']),
  location: z.string().max(100).optional().nullable(),
  remark: z.string().optional().nullable(),
});
export const updateSparePartSchema = createSparePartSchema.partial();
export const sparePartQuerySchema = z.object({
  siteId: z.string().uuid().optional(),
  equipmentTypeId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  status: z
    .enum(['IN_SERVICE', 'BORROWED', 'IN_STOCK', 'MAINTENANCE', 'LOST', 'DECOMMISSIONED'])
    .optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
