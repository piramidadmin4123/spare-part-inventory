import { z } from 'zod';

const toIsoDatetime = z
  .string()
  .refine((v) => v !== '' && !isNaN(new Date(v).getTime()), 'Invalid datetime')
  .transform((v) => new Date(v).toISOString());

function isBefore(left: string, right: string): boolean {
  return new Date(left).getTime() < new Date(right).getTime();
}

const borrowRequestBaseSchema = z.object({
  sparePartId: z.string().uuid(),
  borrowerName: z.string().min(1, 'กรุณาระบุชื่อผู้ยืม').max(200),
  borrowerEmail: z.string().email('Email ไม่ถูกต้อง'),
  project: z.string().max(200).optional(),
  dateStart: toIsoDatetime,
  expectedReturn: toIsoDatetime.optional(),
  borrowerRemark: z.string().optional(),
});

export const borrowRequestSchema = borrowRequestBaseSchema.superRefine((data, ctx) => {
  if (data.expectedReturn && isBefore(data.expectedReturn, data.dateStart)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expectedReturn'],
      message: 'วันที่คาดว่าจะคืนต้องไม่ก่อนวันที่เริ่มยืม',
    });
  }
});

export type BorrowRequestInput = z.infer<typeof borrowRequestSchema>;

export const approveSchema = z.object({
  approverRemark: z.string().optional(),
});

export const returnSchema = z.object({
  actualReturn: toIsoDatetime,
  borrowerRemark: z.string().optional(),
});

export const rejectSchema = z.object({
  approverRemark: z.string().optional(),
});

export const cancelSchema = z.object({
  borrowerRemark: z.string().optional(),
});

const editBorrowBaseSchema = z.object({
  borrowerName: z.string().min(1, 'กรุณาระบุชื่อผู้ยืม').max(200).optional(),
  borrowerEmail: z.string().email('Email ไม่ถูกต้อง').optional(),
  project: z.string().max(200).optional().nullable(),
  dateStart: toIsoDatetime.optional(),
  expectedReturn: toIsoDatetime.optional(),
  borrowerRemark: z.string().optional().nullable(),
});

export const editBorrowSchema = editBorrowBaseSchema.superRefine((data, ctx) => {
  if (data.dateStart && data.expectedReturn && isBefore(data.expectedReturn, data.dateStart)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expectedReturn'],
      message: 'วันที่คาดว่าจะคืนต้องไม่ก่อนวันที่เริ่มยืม',
    });
  }
});

export type EditBorrowInput = z.infer<typeof editBorrowSchema>;
