import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { prisma } from '../../lib/prisma.js';
import { createSiteSchema, updateSiteSchema } from '@spare-part/shared';

export const sitesRouter: IRouter = Router();

sitesRouter.use(requireAuth);

// GET /api/sites — all authenticated roles
sitesRouter.get('/', async (_req, res, next) => {
  try {
    const sites = await prisma.site.findMany({ orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }] });
    res.json(sites);
  } catch (err) {
    next(err);
  }
});

// GET /api/sites/stats — sites with spare-part & order counts
sitesRouter.get('/stats', async (_req, res, next) => {
  try {
    const sites = await prisma.site.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      include: {
        _count: { select: { spareParts: true, additionalOrders: true } },
      },
    });

    // Status breakdown per site
    const statusGroups = await prisma.sparePart.groupBy({
      by: ['siteId', 'status'],
      _count: { _all: true },
    });

    const orderStatusGroups = await prisma.additionalOrder.groupBy({
      by: ['siteId', 'status'],
      _count: { _all: true },
    });

    const result = sites.map((site) => {
      const partsByStatus = statusGroups
        .filter((g) => g.siteId === site.id)
        .reduce<Record<string, number>>((acc, g) => {
          acc[g.status] = g._count._all;
          return acc;
        }, {});

      const ordersByStatus = orderStatusGroups
        .filter((g) => g.siteId === site.id)
        .reduce<Record<string, number>>((acc, g) => {
          acc[g.status] = g._count._all;
          return acc;
        }, {});

      return {
        id: site.id,
        code: site.code,
        name: site.name,
        sortOrder: site.sortOrder,
        totalParts: site._count.spareParts,
        totalOrders: site._count.additionalOrders,
        partsByStatus,
        ordersByStatus,
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/sites/:id
sitesRouter.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const site = await prisma.site.findUnique({ where: { id } });
    if (!site) throw new AppError(404, 'NOT_FOUND', 'Site not found');
    res.json(site);
  } catch (err) {
    next(err);
  }
});

// POST /api/sites — ADMIN, MANAGER
sitesRouter.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const parsed = createSiteSchema.safeParse(req.body);
    if (!parsed.success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', parsed.error.issues);

    const exists = await prisma.site.findUnique({ where: { code: parsed.data.code } });
    if (exists)
      throw new AppError(409, 'CONFLICT', `Site code "${parsed.data.code}" already exists`);

    const site = await prisma.site.create({ data: parsed.data });
    res.status(201).json(site);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/sites/:id — ADMIN, MANAGER
sitesRouter.patch('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const parsed = updateSiteSchema.safeParse(req.body);
    if (!parsed.success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', parsed.error.issues);

    const site = await prisma.site.findUnique({ where: { id } });
    if (!site) throw new AppError(404, 'NOT_FOUND', 'Site not found');

    if (parsed.data.code && parsed.data.code !== site.code) {
      const exists = await prisma.site.findUnique({ where: { code: parsed.data.code } });
      if (exists)
        throw new AppError(409, 'CONFLICT', `Site code "${parsed.data.code}" already exists`);
    }

    const updated = await prisma.site.update({ where: { id }, data: parsed.data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/sites/:id — ADMIN only (soft delete)
sitesRouter.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const site = await prisma.site.findUnique({ where: { id } });
    if (!site) throw new AppError(404, 'NOT_FOUND', 'Site not found');

    await prisma.site.update({ where: { id }, data: { isActive: false } });
    res.json({ message: 'Site deactivated' });
  } catch (err) {
    next(err);
  }
});
