import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';

export const dashboardRouter: IRouter = Router();
dashboardRouter.use(requireAuth);

// GET /api/dashboard/summary
dashboardRouter.get('/summary', async (_req, res, next) => {
  try {
    const now = new Date();

    const [
      totalParts,
      byStatus,
      pendingBorrows,
      borrowByStatus,
      overdueItems,
      overdueBorrowers,
      allNonRetiredParts,
      brandRows,
    ] = await Promise.all([
      prisma.sparePart.count(),
      prisma.sparePart.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.borrowTransaction.count({ where: { status: 'PENDING' } }),
      prisma.borrowTransaction.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.borrowTransaction.count({
        where: {
          status: 'APPROVED',
          expectedReturn: { lt: now },
          actualReturn: null,
        },
      }),
      prisma.borrowTransaction.groupBy({
        by: ['borrowerId'],
        where: {
          status: 'APPROVED',
          expectedReturn: { lt: now },
          actualReturn: null,
        },
        _count: { _all: true },
      }),
      prisma.sparePart.findMany({
        where: { status: { notIn: ['DECOMMISSIONED', 'LOST'] } },
        select: { siteId: true, materialCode: true, modelCode: true, minStock: true },
      }),
      prisma.sparePart.findMany({
        select: { brand: { select: { name: true } } },
      }),
    ]);

    const groupCounts = new Map<string, { count: number; minStock: number }>();
    for (const p of allNonRetiredParts) {
      const key = `${p.siteId}::${p.materialCode ?? p.modelCode}`;
      const existing = groupCounts.get(key);
      if (existing) {
        existing.count += 1;
        if (p.minStock > existing.minStock) existing.minStock = p.minStock;
      } else {
        groupCounts.set(key, { count: 1, minStock: p.minStock });
      }
    }
    const lowStock = Array.from(groupCounts.values()).filter(
      (g) => g.minStock > 0 && g.count < g.minStock
    ).length;

    const brandCountMap = new Map<string, number>();
    for (const r of brandRows) {
      const name = r.brand.name;
      brandCountMap.set(name, (brandCountMap.get(name) ?? 0) + 1);
    }
    const byBrand = Array.from(brandCountMap.entries())
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      totalParts,
      pendingBorrows,
      overdueItems,
      overdueBorrowers: overdueBorrowers.length,
      lowStock,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      borrowByStatus: borrowByStatus.map((s) => ({ status: s.status, count: s._count.id })),
      byBrand,
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
    });

    type Group = {
      key: string;
      materialCode: string | null;
      modelCode: string;
      productName: string;
      siteCode: string;
      brandName: string;
      count: number;
      minStock: number;
    };

    const groups = new Map<string, Group>();
    for (const p of parts) {
      const key = `${p.siteId}::${p.materialCode ?? p.modelCode}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
        if (p.minStock > existing.minStock) existing.minStock = p.minStock;
      } else {
        groups.set(key, {
          key,
          materialCode: p.materialCode,
          modelCode: p.modelCode,
          productName: p.productName,
          siteCode: p.site.code,
          brandName: p.brand.name,
          count: 1,
          minStock: p.minStock,
        });
      }
    }

    const items = Array.from(groups.values())
      .filter((g) => g.minStock > 0 && g.count < g.minStock)
      .sort((a, b) => a.count - b.count - (a.minStock - b.minStock))
      .slice(0, 15);

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
