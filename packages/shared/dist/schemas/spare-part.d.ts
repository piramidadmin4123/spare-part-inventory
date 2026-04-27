import { z } from 'zod';
export declare const createSparePartSchema: z.ZodObject<
  {
    siteId: z.ZodString;
    equipmentTypeId: z.ZodString;
    brandId: z.ZodString;
    materialCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    modelCode: z.ZodString;
    productName: z.ZodString;
    serialNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    macAddress: z.ZodUnion<
      [z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodEffects<z.ZodLiteral<''>, null, ''>]
    >;
    quantity: z.ZodDefault<z.ZodNumber>;
    minStock: z.ZodDefault<z.ZodNumber>;
    cost: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    status: z.ZodEnum<
      ['IN_SERVICE', 'BORROWED', 'IN_STOCK', 'MAINTENANCE', 'LOST', 'DECOMMISSIONED']
    >;
    location: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    remark: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    imageUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    status: 'IN_SERVICE' | 'BORROWED' | 'IN_STOCK' | 'MAINTENANCE' | 'LOST' | 'DECOMMISSIONED';
    siteId: string;
    equipmentTypeId: string;
    brandId: string;
    modelCode: string;
    productName: string;
    quantity: number;
    minStock: number;
    materialCode?: string | null | undefined;
    serialNumber?: string | null | undefined;
    macAddress?: string | null | undefined;
    cost?: number | null | undefined;
    location?: string | null | undefined;
    remark?: string | null | undefined;
    imageUrl?: string | null | undefined;
  },
  {
    status: 'IN_SERVICE' | 'BORROWED' | 'IN_STOCK' | 'MAINTENANCE' | 'LOST' | 'DECOMMISSIONED';
    siteId: string;
    equipmentTypeId: string;
    brandId: string;
    modelCode: string;
    productName: string;
    materialCode?: string | null | undefined;
    serialNumber?: string | null | undefined;
    macAddress?: string | null | undefined;
    quantity?: number | undefined;
    minStock?: number | undefined;
    cost?: number | null | undefined;
    location?: string | null | undefined;
    remark?: string | null | undefined;
    imageUrl?: string | null | undefined;
  }
>;
export type CreateSparePartInput = z.infer<typeof createSparePartSchema>;
export declare const updateSparePartSchema: z.ZodObject<
  {
    siteId: z.ZodOptional<z.ZodString>;
    equipmentTypeId: z.ZodOptional<z.ZodString>;
    brandId: z.ZodOptional<z.ZodString>;
    materialCode: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    modelCode: z.ZodOptional<z.ZodString>;
    productName: z.ZodOptional<z.ZodString>;
    serialNumber: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    macAddress: z.ZodOptional<
      z.ZodUnion<
        [z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodEffects<z.ZodLiteral<''>, null, ''>]
      >
    >;
    quantity: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    minStock: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    cost: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    status: z.ZodOptional<
      z.ZodEnum<['IN_SERVICE', 'BORROWED', 'IN_STOCK', 'MAINTENANCE', 'LOST', 'DECOMMISSIONED']>
    >;
    location: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    remark: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    imageUrl: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    status?:
      | 'IN_SERVICE'
      | 'BORROWED'
      | 'IN_STOCK'
      | 'MAINTENANCE'
      | 'LOST'
      | 'DECOMMISSIONED'
      | undefined;
    siteId?: string | undefined;
    equipmentTypeId?: string | undefined;
    brandId?: string | undefined;
    materialCode?: string | null | undefined;
    modelCode?: string | undefined;
    productName?: string | undefined;
    serialNumber?: string | null | undefined;
    macAddress?: string | null | undefined;
    quantity?: number | undefined;
    minStock?: number | undefined;
    cost?: number | null | undefined;
    location?: string | null | undefined;
    remark?: string | null | undefined;
    imageUrl?: string | null | undefined;
  },
  {
    status?:
      | 'IN_SERVICE'
      | 'BORROWED'
      | 'IN_STOCK'
      | 'MAINTENANCE'
      | 'LOST'
      | 'DECOMMISSIONED'
      | undefined;
    siteId?: string | undefined;
    equipmentTypeId?: string | undefined;
    brandId?: string | undefined;
    materialCode?: string | null | undefined;
    modelCode?: string | undefined;
    productName?: string | undefined;
    serialNumber?: string | null | undefined;
    macAddress?: string | null | undefined;
    quantity?: number | undefined;
    minStock?: number | undefined;
    cost?: number | null | undefined;
    location?: string | null | undefined;
    remark?: string | null | undefined;
    imageUrl?: string | null | undefined;
  }
>;
export type UpdateSparePartInput = z.infer<typeof updateSparePartSchema>;
export declare const sparePartQuerySchema: z.ZodObject<
  {
    siteId: z.ZodOptional<z.ZodString>;
    equipmentTypeId: z.ZodOptional<z.ZodString>;
    brandId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<
      z.ZodEnum<['IN_SERVICE', 'BORROWED', 'IN_STOCK', 'MAINTENANCE', 'LOST', 'DECOMMISSIONED']>
    >;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodDefault<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<['asc', 'desc']>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    status?:
      | 'IN_SERVICE'
      | 'BORROWED'
      | 'IN_STOCK'
      | 'MAINTENANCE'
      | 'LOST'
      | 'DECOMMISSIONED'
      | undefined;
    siteId?: string | undefined;
    equipmentTypeId?: string | undefined;
    brandId?: string | undefined;
    search?: string | undefined;
  },
  {
    status?:
      | 'IN_SERVICE'
      | 'BORROWED'
      | 'IN_STOCK'
      | 'MAINTENANCE'
      | 'LOST'
      | 'DECOMMISSIONED'
      | undefined;
    siteId?: string | undefined;
    equipmentTypeId?: string | undefined;
    brandId?: string | undefined;
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: 'asc' | 'desc' | undefined;
  }
>;
export type SparePartQuery = z.infer<typeof sparePartQuerySchema>;
