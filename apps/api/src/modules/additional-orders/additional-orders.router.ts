import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';

export const additionalOrdersRouter: IRouter = Router();

additionalOrdersRouter.use(requireAuth);

// GET /api/additional-orders
additionalOrdersRouter.get('/', async (req, res, next) => {
  try {
    const {
      siteId,
      status,
      search,
      page = '1',
      limit = '50',
    } = req.query as Record<string, string>;
    const take = Math.min(parseInt(limit) || 50, 200);
    const skip = (parseInt(page) - 1) * take;

    const where: Prisma.AdditionalOrderWhereInput = {
      ...(siteId && { siteId }),
      ...(status && { status: status as Prisma.EnumOrderStatusFilter }),
      ...(search && {
        OR: [
          { productName: { contains: search, mode: 'insensitive' } },
          { modelCode: { contains: search, mode: 'insensitive' } },
          { type: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [orders, total] = await Promise.all([
      prisma.additionalOrder.findMany({
        where,
        include: {
          site: { select: { id: true, code: true, name: true } },
          brand: { select: { id: true, name: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
        take,
        skip,
      }),
      prisma.additionalOrder.count({ where }),
    ]);

    res.json({ orders, total, page: parseInt(page), limit: take });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/additional-orders/:id — update status/remark
additionalOrdersRouter.patch('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { status, remark } = req.body as { status?: string; remark?: string };
    const validStatuses = ['PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED'];
    if (status && !validStatuses.includes(status))
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid status');

    const order = await prisma.additionalOrder.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status: status as 'PENDING' | 'ORDERED' | 'RECEIVED' | 'CANCELLED' }),
        ...(remark !== undefined && { remark }),
      },
      include: {
        site: { select: { id: true, code: true, name: true } },
        brand: { select: { id: true, name: true } },
      },
    });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/additional-orders/:id
additionalOrdersRouter.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    await prisma.additionalOrder.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
