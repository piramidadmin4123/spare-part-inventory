import { z } from 'zod';
export declare const borrowRequestSchema: z.ZodObject<
  {
    sparePartId: z.ZodString;
    borrowerName: z.ZodString;
    borrowerEmail: z.ZodString;
    project: z.ZodOptional<z.ZodString>;
    dateStart: z.ZodEffects<z.ZodString, string, unknown>;
    expectedReturn: z.ZodOptional<z.ZodEffects<z.ZodString, string, unknown>>;
    borrowerRemark: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    sparePartId: string;
    borrowerName: string;
    borrowerEmail: string;
    dateStart: string;
    project?: string | undefined;
    expectedReturn?: string | undefined;
    borrowerRemark?: string | undefined;
  },
  {
    sparePartId: string;
    borrowerName: string;
    borrowerEmail: string;
    project?: string | undefined;
    dateStart?: unknown;
    expectedReturn?: unknown;
    borrowerRemark?: string | undefined;
  }
>;
export type BorrowRequestInput = z.infer<typeof borrowRequestSchema>;
export declare const approveSchema: z.ZodObject<
  {
    approverRemark: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    approverRemark?: string | undefined;
  },
  {
    approverRemark?: string | undefined;
  }
>;
export declare const returnSchema: z.ZodObject<
  {
    actualReturn: z.ZodEffects<z.ZodString, string, unknown>;
    borrowerRemark: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    actualReturn: string;
    borrowerRemark?: string | undefined;
  },
  {
    borrowerRemark?: string | undefined;
    actualReturn?: unknown;
  }
>;
export declare const rejectSchema: z.ZodObject<
  {
    approverRemark: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    approverRemark?: string | undefined;
  },
  {
    approverRemark?: string | undefined;
  }
>;
export declare const cancelSchema: z.ZodObject<
  {
    borrowerRemark: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    borrowerRemark?: string | undefined;
  },
  {
    borrowerRemark?: string | undefined;
  }
>;
export declare const editBorrowSchema: z.ZodObject<
  {
    borrowerName: z.ZodOptional<z.ZodString>;
    borrowerEmail: z.ZodOptional<z.ZodString>;
    project: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    dateStart: z.ZodOptional<z.ZodEffects<z.ZodString, string, unknown>>;
    expectedReturn: z.ZodOptional<z.ZodEffects<z.ZodString, string, unknown>>;
    borrowerRemark: z.ZodNullable<z.ZodOptional<z.ZodString>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    borrowerName?: string | undefined;
    borrowerEmail?: string | undefined;
    project?: string | null | undefined;
    dateStart?: string | undefined;
    expectedReturn?: string | undefined;
    borrowerRemark?: string | null | undefined;
  },
  {
    borrowerName?: string | undefined;
    borrowerEmail?: string | undefined;
    project?: string | null | undefined;
    dateStart?: unknown;
    expectedReturn?: unknown;
    borrowerRemark?: string | null | undefined;
  }
>;
export type EditBorrowInput = z.infer<typeof editBorrowSchema>;
