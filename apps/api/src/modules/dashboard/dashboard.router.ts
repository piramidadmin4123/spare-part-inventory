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
        select: { brand: { select: { name: true } } },
      }),
    ]);

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
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      borrowByStatus: borrowByStatus.map((s) => ({ status: s.status, count: s._count.id })),
      byBrand,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/borrow-timeline
// สรุปการยืมรายสัปดาห์ของเดือนปัจจุบัน แยกตาม Brand (ข้อมูลเดือนก่อนจะไม่แสดง = รีเซ็ตทุกเดือน)
dashboardRouter.get('/borrow-timeline', async (_req, res, next) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const MS_PER_DAY = 86_400_000;

    // นับเฉพาะรายการที่ถูกยืมจริง (อนุมัติแล้ว / คืนแล้ว) ในเดือนนี้
    const txs = await prisma.borrowTransaction.findMany({
      where: {
        status: { in: ['APPROVED', 'RETURNED'] },
        createdAt: { gte: monthStart },
      },
      include: {
        sparePart: {
          include: { brand: { select: { name: true } }, site: { select: { code: true } } },
        },
        borrower: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // สร้างถังรายสัปดาห์ (ช่วงละ 7 วันนับจากวันที่ 1 ของเดือน จนถึงปัจจุบัน)
    const daysElapsed = Math.floor((now.getTime() - monthStart.getTime()) / MS_PER_DAY);
    const weekCount = Math.max(1, Math.floor(daysElapsed / 7) + 1);

    type WeekBucket = { start: Date; end: Date; brandCounts: Map<string, number>; total: number };
    const weeks: WeekBucket[] = [];
    for (let i = 0; i < weekCount; i++) {
      const start = new Date(monthStart);
      start.setDate(monthStart.getDate() + i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      weeks.push({ start, end, brandCounts: new Map(), total: 0 });
    }

    type BrandStat = {
      total: number;
      borrowers: Map<string, number>;
      sites: Map<string, number>;
    };
    const brandSummary = new Map<string, BrandStat>();

    for (const tx of txs) {
      const brand = tx.sparePart.brand.name;
      const site = tx.sparePart.site.code;
      const borrower = tx.borrowerName ?? tx.borrower.name;

      const dayIdx = Math.floor((tx.createdAt.getTime() - monthStart.getTime()) / MS_PER_DAY);
      const wIdx = Math.min(weeks.length - 1, Math.max(0, Math.floor(dayIdx / 7)));
      const wk = weeks[wIdx];
      wk.brandCounts.set(brand, (wk.brandCounts.get(brand) ?? 0) + 1);
      wk.total += 1;

      let bs = brandSummary.get(brand);
      if (!bs) {
        bs = { total: 0, borrowers: new Map(), sites: new Map() };
        brandSummary.set(brand, bs);
      }
      bs.total += 1;
      bs.borrowers.set(borrower, (bs.borrowers.get(borrower) ?? 0) + 1);
      bs.sites.set(site, (bs.sites.get(site) ?? 0) + 1);
    }

    const fmtDay = (d: Date) => `${d.getDate()}`;
    const monthLabel = monthStart.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

    res.json({
      monthLabel,
      totalBrands: brandSummary.size,
      totalBorrows: txs.length,
      weeks: weeks.map((w, i) => ({
        index: i + 1,
        label: `สัปดาห์ ${i + 1}`,
        range: `${fmtDay(w.start)}–${fmtDay(w.end)}`,
        start: w.start.toISOString().slice(0, 10),
        end: w.end.toISOString().slice(0, 10),
        total: w.total,
        brands: Array.from(w.brandCounts.entries())
          .map(([brand, count]) => ({ brand, count }))
          .sort((a, b) => b.count - a.count),
      })),
      brandSummary: Array.from(brandSummary.entries())
        .map(([brand, s]) => ({
          brand,
          total: s.total,
          borrowers: Array.from(s.borrowers.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count),
          sites: Array.from(s.sites.entries())
            .map(([site, count]) => ({ site, count }))
            .sort((a, b) => b.count - a.count),
        }))
        .sort((a, b) => b.total - a.total),
    });
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
