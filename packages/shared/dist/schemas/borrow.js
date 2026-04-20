import { z } from 'zod';
const toIsoDatetime = z.preprocess(
  (v) => (typeof v === 'string' && v ? new Date(v).toISOString() : v),
  z.string().datetime()
);
export const borrowRequestSchema = z.object({
  sparePartId: z.string().uuid(),
  borrowerName: z.string().min(1, 'กรุณาระบุชื่อผู้ยืม').max(200),
  borrowerEmail: z.string().email('Email ไม่ถูกต้อง'),
  project: z.string().max(200).optional(),
  dateStart: toIsoDatetime,
  expectedReturn: toIsoDatetime.optional(),
  borrowerRemark: z.string().optional(),
});
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
export const editBorrowSchema = z.object({
  borrowerName: z.string().min(1, 'กรุณาระบุชื่อผู้ยืม').max(200).optional(),
  borrowerEmail: z.string().email('Email ไม่ถูกต้อง').optional(),
  project: z.string().max(200).optional().nullable(),
  dateStart: toIsoDatetime.optional(),
  expectedReturn: toIsoDatetime.optional(),
  borrowerRemark: z.string().optional().nullable(),
});
