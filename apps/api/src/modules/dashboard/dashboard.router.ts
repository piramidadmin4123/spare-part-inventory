import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';

export const dashboardRouter: IRouter = Router();
dashboardRouter.use(requireAuth);

// GET /api/dashboard/summary
dashboardRouter.get('/summary', async (_req, res, next) => {
  try {
    const [totalParts, byStatus, pendingBorrows, borrowByStatus, allNonRetiredParts] =
      await Promise.all([
        prisma.sparePart.count(),
        prisma.sparePart.groupBy({ by: ['status'], _count: { id: true } }),
        prisma.borrowTransaction.count({ where: { status: 'PENDING' } }),
        prisma.borrowTransaction.groupBy({ by: ['status'], _count: { id: true } }),
        prisma.sparePart.findMany({
          where: { status: { notIn: ['DECOMMISSIONED', 'LOST'] } },
          select: { quantity: true, minStock: true },
        }),
      ]);

    const lowStock = allNonRetiredParts.filter((p) => p.quantity <= p.minStock).length;

    res.json({
      totalParts,
      pendingBorrows,
      lowStock,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      borrowByStatus: borrowByStatus.map((s) => ({ status: s.status, count: s._count.id })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/low-stock
dashboardRouter.get('/low-stock', async (_req, res, next) => {
  try {
    const parts = await prisma.sparePart.findMany({
      where: { status: { notIn: ['DECOMMISSIONED', 'LOST'] } },
      include: { site: true, brand: true },
      orderBy: { quantity: 'asc' },
    });

    const items = parts
      .filter((p) => p.quantity <= p.minStock)
      .slice(0, 15)
      .map((p) => ({
        id: p.id,
        modelCode: p.modelCode,
        productName: p.productName,
        quantity: p.quantity,
        minStock: p.minStock,
        status: p.status,
        siteCode: p.site.code,
        brandName: p.brand.name,
      }));

    res.json(items);
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/recent-borrows
dashboardRouter.get('/recent-borrows', async (_req, res, next) => {
  try {
    const txs = await prisma.borrowTransaction.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        sparePart: { include: { site: true } },
        borrower: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true } },
      },
    });
    res.json(txs);
  } catch (err) {
    next(err);
  }
});
