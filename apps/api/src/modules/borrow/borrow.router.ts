import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { prisma } from '../../lib/prisma.js';
import {
  borrowRequestSchema,
  approveSchema,
  returnSchema,
  rejectSchema,
  cancelSchema,
  editBorrowSchema,
} from '@spare-part/shared';
import type { Prisma } from '@prisma/client';
import {
  notifyNewBorrow,
  notifyBorrowApproved,
  notifyBorrowRejected,
  notifyBorrowReturned,
} from '../../lib/notify.js';
import { isSuperAdminRole } from '../../lib/roles.js';
import { recordAuditLog } from '../../lib/audit.js';

export const borrowRouter: IRouter = Router();

borrowRouter.use(requireAuth);

function isBefore(left: Date | null | undefined, right: Date | null | undefined): boolean {
  return Boolean(left && right && left.getTime() < right.getTime());
}

const borrowInclude = {
  sparePart: { include: { site: true, equipmentType: true, brand: true } },
  borrower: { select: { id: true, name: true, email: true, role: true } },
  approver: { select: { id: true, name: true, email: true } },
} satisfies Prisma.BorrowTransactionInclude;

// GET /api/borrow
borrowRouter.get('/', async (req, res, next) => {
  try {
    const {
      status,
      borrowerId,
      sparePartId,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));

    const where: Prisma.BorrowTransactionWhereInput = {
      ...(status && { status: status as Prisma.EnumBorrowStatusFilter }),
      ...(borrowerId && { borrowerId }),
      ...(sparePartId && { sparePartId }),
    };

    const [data, total] = await Promise.all([
      prisma.borrowTransaction.findMany({
        where,
        include: borrowInclude,
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * l,
        take: l,
      }),
      prisma.borrowTransaction.count({ where }),
    ]);

    res.json({ data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } });
  } catch (err) {
    next(err);
  }
});

// GET /api/borrow/:id
borrowRouter.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const tx = await prisma.borrowTransaction.findUnique({ where: { id }, include: borrowInclude });
    if (!tx) throw new AppError(404, 'NOT_FOUND', 'Borrow transaction not found');
    res.json(tx);
  } catch (err) {
    next(err);
  }
});

// POST /api/borrow — ADMIN, MANAGER, TECHNICIAN
borrowRouter.post('/', requireRole('ADMIN', 'MANAGER', 'TECHNICIAN'), async (req, res, next) => {
  try {
    const parsed = borrowRequestSchema.safeParse(req.body);
    if (!parsed.success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', parsed.error.issues);

    const part = await prisma.sparePart.findUnique({ where: { id: parsed.data.sparePartId } });
    if (!part) throw new AppError(404, 'NOT_FOUND', 'Spare part not found');
    if (part.quantity < 1)
      throw new AppError(409, 'INSUFFICIENT_STOCK', 'No stock available to borrow');

    const active = await prisma.borrowTransaction.findFirst({
      where: { sparePartId: parsed.data.sparePartId, status: { in: ['PENDING', 'APPROVED'] } },
    });
    if (active)
      throw new AppError(409, 'CONFLICT', 'This item already has an active borrow request');

    const tx = await prisma.borrowTransaction.create({
      data: {
        sparePartId: parsed.data.sparePartId,
        borrowerId: req.user!.id,
        borrowerName: parsed.data.borrowerName,
        borrowerEmail: parsed.data.borrowerEmail,
        project: parsed.data.project,
        dateStart: parsed.data.dateStart ? new Date(parsed.data.dateStart) : null,
        expectedReturn: parsed.data.expectedReturn ? new Date(parsed.data.expectedReturn) : null,
        borrowerRemark: parsed.data.borrowerRemark,
        status: 'PENDING',
      },
      include: borrowInclude,
    });

    res.status(201).json(tx);

    notifyNewBorrow({
      id: tx.id,
      modelCode: tx.sparePart.modelCode,
      productName: tx.sparePart.productName,
      siteCode: tx.sparePart.site.code,
      borrowerName: tx.borrowerName ?? tx.borrower.name,
      borrowerEmail: tx.borrowerEmail ?? tx.borrower.email,
      project: tx.project,
    }).catch(() => {});
  } catch (err) {
    next(err);
  }
});

// PATCH /api/borrow/:id — edit PENDING request
borrowRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const tx = await prisma.borrowTransaction.findUnique({ where: { id } });
    if (!tx) throw new AppError(404, 'NOT_FOUND', 'Borrow transaction not found');
    if (tx.status !== 'PENDING')
      throw new AppError(409, 'CONFLICT', 'Only PENDING requests can be edited');

    const user = req.user!;
    if (tx.borrowerId !== user.id)
      throw new AppError(403, 'FORBIDDEN', 'You can only edit your own requests');

    const parsed = editBorrowSchema.safeParse(req.body);
    if (!parsed.success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', parsed.error.issues);

    const nextDateStart =
      parsed.data.dateStart !== undefined ? new Date(parsed.data.dateStart) : tx.dateStart;
    const nextExpectedReturn =
      parsed.data.expectedReturn !== undefined
        ? new Date(parsed.data.expectedReturn)
        : tx.expectedReturn;

    if (isBefore(nextExpectedReturn, nextDateStart)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'วันที่คาดว่าจะคืนต้องไม่ก่อนวันที่เริ่มยืม', [
        { path: 'expectedReturn', message: 'วันที่คาดว่าจะคืนต้องไม่ก่อนวันที่เริ่มยืม' },
      ]);
    }

    const updated = await prisma.borrowTransaction.update({
      where: { id },
      data: {
        ...(parsed.data.borrowerName !== undefined && { borrowerName: parsed.data.borrowerName }),
        ...(parsed.data.borrowerEmail !== undefined && {
          borrowerEmail: parsed.data.borrowerEmail,
        }),
        ...(parsed.data.project !== undefined && { project: parsed.data.project }),
        ...(parsed.data.dateStart !== undefined && {
          dateStart: parsed.data.dateStart ? new Date(parsed.data.dateStart) : null,
        }),
        ...(parsed.data.expectedReturn !== undefined && {
          expectedReturn: parsed.data.expectedReturn ? new Date(parsed.data.expectedReturn) : null,
        }),
        ...(parsed.data.borrowerRemark !== undefined && {
          borrowerRemark: parsed.data.borrowerRemark,
        }),
      },
      include: borrowInclude,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/borrow/:id — ADMIN, MANAGER, SUPER_ADMIN
borrowRouter.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const tx = await prisma.borrowTransaction.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        sparePartId: true,
        borrowerId: true,
        approverId: true,
        borrowerRemark: true,
        approverRemark: true,
      },
    });
    if (!tx) throw new AppError(404, 'NOT_FOUND', 'Borrow transaction not found');
    const canForceDelete = isSuperAdminRole(req.user?.role);

    if (tx.status !== 'PENDING' && !canForceDelete)
      throw new AppError(409, 'CONFLICT', 'Only PENDING requests can be deleted');

    if (tx.status === 'APPROVED') {
      await prisma.$transaction([
        prisma.sparePart.update({
          where: { id: tx.sparePartId },
          data: { status: 'IN_STOCK', quantity: { increment: 1 } },
        }),
        prisma.borrowTransaction.delete({ where: { id } }),
      ]);
    } else {
      await prisma.borrowTransaction.delete({ where: { id } });
    }

    await recordAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entityType: 'BorrowTransaction',
      entityId: tx.id,
      oldValue: tx,
      newValue: null,
      ipAddress: req.ip,
    }).catch(() => {});

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// PATCH /api/borrow/:id/approve — ADMIN, MANAGER
borrowRouter.patch('/:id/approve', requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const parsed = approveSchema.safeParse(req.body);
    if (!parsed.success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', parsed.error.issues);

    const tx = await prisma.borrowTransaction.findUnique({ where: { id } });
    if (!tx) throw new AppError(404, 'NOT_FOUND', 'Borrow transaction not found');
    if (tx.status !== 'PENDING')
      throw new AppError(
        409,
        'CONFLICT',
        `Cannot approve a transaction with status "${tx.status}"`
      );
    if (tx.borrowerId === req.user!.id)
      throw new AppError(403, 'FORBIDDEN', 'You cannot approve your own borrow request');

    const [updated] = await prisma.$transaction([
      prisma.borrowTransaction.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approverId: req.user!.id,
          approverRemark: parsed.data.approverRemark,
        },
        include: borrowInclude,
      }),
      prisma.sparePart.update({
        where: { id: tx.sparePartId },
        data: { status: 'BORROWED', quantity: { decrement: 1 } },
      }),
    ]);

    await recordAuditLog({
      userId: req.user!.id,
      action: 'APPROVE',
      entityType: 'BorrowTransaction',
      entityId: updated.id,
      oldValue: { status: tx.status, sparePartId: tx.sparePartId },
      newValue: { status: updated.status, sparePartId: updated.sparePart.id },
      ipAddress: req.ip,
    }).catch(() => {});

    res.json(updated);

    notifyBorrowApproved({
      id: updated.id,
      modelCode: updated.sparePart.modelCode,
      productName: updated.sparePart.productName,
      siteCode: updated.sparePart.site.code,
      borrowerName: updated.borrowerName ?? updated.borrower.name,
      borrowerEmail: updated.borrowerEmail ?? updated.borrower.email,
      project: updated.project,
      approverName: updated.approver?.name ?? req.user!.email,
    }).catch(() => {});
  } catch (err) {
    next(err);
  }
});

// PATCH /api/borrow/:id/reject — ADMIN, MANAGER
borrowRouter.patch('/:id/reject', requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', parsed.error.issues);

    const tx = await prisma.borrowTransaction.findUnique({ where: { id } });
    if (!tx) throw new AppError(404, 'NOT_FOUND', 'Borrow transaction not found');
    if (tx.status !== 'PENDING')
      throw new AppError(409, 'CONFLICT', `Cannot reject a transaction with status "${tx.status}"`);

    const updated = await prisma.borrowTransaction.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approverId: req.user!.id,
        approverRemark: parsed.data.approverRemark,
      },
      include: borrowInclude,
    });

    await recordAuditLog({
      userId: req.user!.id,
      action: 'REJECT',
      entityType: 'BorrowTransaction',
      entityId: updated.id,
      oldValue: { status: tx.status, sparePartId: tx.sparePartId },
      newValue: { status: updated.status, sparePartId: updated.sparePart.id },
      ipAddress: req.ip,
    }).catch(() => {});

    res.json(updated);

    notifyBorrowRejected({
      id: updated.id,
      modelCode: updated.sparePart.modelCode,
      productName: updated.sparePart.productName,
      siteCode: updated.sparePart.site.code,
      borrowerName: updated.borrowerName ?? updated.borrower.name,
      borrowerEmail: updated.borrowerEmail ?? updated.borrower.email,
      project: updated.project,
      approverName: updated.approver?.name ?? req.user!.email,
      reason: parsed.data.approverRemark,
    }).catch(() => {});
  } catch (err) {
    next(err);
  }
});

// PATCH /api/borrow/:id/restore — ADMIN, MANAGER
borrowRouter.patch('/:id/restore', requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const id = req.params.id as string;

    const tx = await prisma.borrowTransaction.findUnique({ where: { id } });
    if (!tx) throw new AppError(404, 'NOT_FOUND', 'Borrow transaction not found');
    if (tx.status !== 'REJECTED')
      throw new AppError(
        409,
        'CONFLICT',
        `Cannot restore a transaction with status "${tx.status}"`
      );

    const active = await prisma.borrowTransaction.findFirst({
      where: {
        id: { not: id },
        sparePartId: tx.sparePartId,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });
    if (active)
      throw new AppError(409, 'CONFLICT', 'This item already has an active borrow request');

    const updated = await prisma.borrowTransaction.update({
      where: { id },
      data: {
        status: 'PENDING',
        approverId: null,
        approverRemark: null,
      },
      include: borrowInclude,
    });

    await recordAuditLog({
      userId: req.user!.id,
      action: 'RESTORE',
      entityType: 'BorrowTransaction',
      entityId: updated.id,
      oldValue: {
        status: tx.status,
        approverId: tx.approverId,
        approverRemark: tx.approverRemark,
      },
      newValue: {
        status: updated.status,
        approverId: updated.approverId,
        approverRemark: updated.approverRemark,
      },
      ipAddress: req.ip,
    }).catch(() => {});

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/borrow/:id/return
borrowRouter.patch('/:id/return', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const parsed = returnSchema.safeParse(req.body);
    if (!parsed.success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', parsed.error.issues);

    const tx = await prisma.borrowTransaction.findUnique({ where: { id } });
    if (!tx) throw new AppError(404, 'NOT_FOUND', 'Borrow transaction not found');
    if (tx.status !== 'APPROVED')
      throw new AppError(409, 'CONFLICT', `Cannot return a transaction with status "${tx.status}"`);

    const actualReturn = new Date(parsed.data.actualReturn);
    if (tx.dateStart && actualReturn < tx.dateStart) {
      throw new AppError(400, 'VALIDATION_ERROR', 'วันที่คืนต้องไม่ก่อนวันที่ยืม', [
        { path: 'actualReturn', message: 'วันที่คืนต้องไม่ก่อนวันที่ยืม' },
      ]);
    }

    const overdueDays =
      tx.expectedReturn && actualReturn > tx.expectedReturn
        ? Math.max(
            1,
            Math.ceil(
              (actualReturn.getTime() - tx.expectedReturn.getTime()) / (1000 * 60 * 60 * 24)
            )
          )
        : 0;

    // only borrower or manager/admin can return
    const user = req.user!;
    if (user.role === 'TECHNICIAN' && tx.borrowerId !== user.id)
      throw new AppError(403, 'FORBIDDEN', 'You can only return your own borrows');

    const [updated] = await prisma.$transaction([
      prisma.borrowTransaction.update({
        where: { id },
        data: {
          status: 'RETURNED',
          actualReturn,
          borrowerRemark: parsed.data.borrowerRemark ?? tx.borrowerRemark,
        },
        include: borrowInclude,
      }),
      prisma.sparePart.update({
        where: { id: tx.sparePartId },
        data: { status: 'IN_STOCK', quantity: { increment: 1 } },
      }),
    ]);

    await recordAuditLog({
      userId: req.user!.id,
      action: 'RETURN',
      entityType: 'BorrowTransaction',
      entityId: updated.id,
      oldValue: {
        status: tx.status,
        actualReturn: tx.actualReturn,
        expectedReturn: tx.expectedReturn,
      },
      newValue: {
        status: updated.status,
        actualReturn: updated.actualReturn,
        expectedReturn: updated.expectedReturn,
      },
      ipAddress: req.ip,
    }).catch(() => {});

    res.json(updated);

    notifyBorrowReturned({
      id: updated.id,
      modelCode: updated.sparePart.modelCode,
      productName: updated.sparePart.productName,
      siteCode: updated.sparePart.site.code,
      borrowerName: updated.borrowerName ?? updated.borrower.name,
      borrowerEmail: updated.borrowerEmail ?? updated.borrower.email,
      project: updated.project,
      overdueDays,
    }).catch(() => {});
  } catch (err) {
    next(err);
  }
});

// PATCH /api/borrow/:id/cancel
borrowRouter.patch('/:id/cancel', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const parsed = cancelSchema.safeParse(req.body);
    if (!parsed.success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', parsed.error.issues);

    const tx = await prisma.borrowTransaction.findUnique({ where: { id } });
    if (!tx) throw new AppError(404, 'NOT_FOUND', 'Borrow transaction not found');
    if (tx.status !== 'PENDING')
      throw new AppError(409, 'CONFLICT', `Cannot cancel a transaction with status "${tx.status}"`);

    const user = req.user!;
    if (user.role === 'TECHNICIAN' && tx.borrowerId !== user.id)
      throw new AppError(403, 'FORBIDDEN', 'You can only cancel your own requests');

    const updated = await prisma.borrowTransaction.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        borrowerRemark: parsed.data.borrowerRemark ?? tx.borrowerRemark,
      },
      include: borrowInclude,
    });

    await recordAuditLog({
      userId: req.user!.id,
      action: 'CANCEL',
      entityType: 'BorrowTransaction',
      entityId: updated.id,
      oldValue: { status: tx.status, borrowerRemark: tx.borrowerRemark },
      newValue: { status: updated.status, borrowerRemark: updated.borrowerRemark },
      ipAddress: req.ip,
    }).catch(() => {});

    res.json(updated);
  } catch (err) {
    next(err);
  }
});
