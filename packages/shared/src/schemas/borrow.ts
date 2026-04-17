import { z } from 'zod';

export const borrowRequestSchema = z.object({
  sparePartId: z.string().uuid(),
  project: z.string().min(1).max(200),
  dateStart: z.string().datetime(),
  expectedReturn: z.string().datetime().optional(),
  borrowerRemark: z.string().optional(),
});

export type BorrowRequestInput = z.infer<typeof borrowRequestSchema>;

export const approveSchema = z.object({
  approverRemark: z.string().optional(),
});

export const returnSchema = z.object({
  actualReturn: z.string().datetime(),
  borrowerRemark: z.string().optional(),
});
