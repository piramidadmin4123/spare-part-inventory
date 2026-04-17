import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { prisma } from '../../lib/prisma.js';
import {
  createSparePartSchema,
  updateSparePartSchema,
  sparePartQuerySchema,
} from '@spare-part/shared';
import type { Prisma } from '@prisma/client';

export const inventoryRouter: IRouter = Router();

inventoryRouter.use(requireAuth);

const sparePartInclude = {
  site: true,
  equipmentType: true,
  brand: true,
} satisfies Prisma.SparePartInclude;

// GET /api/spare-parts
inventoryRouter.get('/', async (req, res, next) => {
  try {
    const parsed = sparePartQuerySchema.safeParse(req.query);
    if (!parsed.success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid query params', parsed.error.issues);

    const { siteId, equipmentTypeId, brandId, status, search, page, limit, sortBy, sortOrder } =
      parsed.data;

    const where: Prisma.SparePartWhereInput = {
      ...(siteId && { siteId }),
      ...(equipmentTypeId && { equipmentTypeId }),
      ...(brandId && { brandId }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { modelCode: { contains: search, mode: 'insensitive' } },
          { productName: { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { materialCode: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.sparePart.findMany({
        where,
        include: sparePartInclude,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sparePart.count({ where }),
    ]);

    res.json({
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/spare-parts/:id
inventoryRouter.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const part = await prisma.sparePart.findUnique({ where: { id }, include: sparePartInclude });
    if (!part) throw new AppError(404, 'NOT_FOUND', 'Spare part not found');
    res.json(part);
  } catch (err) {
    next(err);
  }
});

// POST /api/spare-parts — ADMIN, MANAGER
inventoryRouter.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const parsed = createSparePartSchema.safeParse(req.body);
    if (!parsed.success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', parsed.error.issues);

    if (parsed.data.serialNumber) {
      const exists = await prisma.sparePart.findUnique({
        where: { serialNumber: parsed.data.serialNumber },
      });
      if (exists) throw new AppError(409, 'CONFLICT', 'Serial number already exists');
    }

    const { cost, ...rest } = parsed.data;
    const part = await prisma.sparePart.create({
      data: { ...rest, cost: cost != null ? cost : undefined },
      include: sparePartInclude,
    });
    res.status(201).json(part);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/spare-parts/:id — ADMIN, MANAGER
inventoryRouter.patch('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const parsed = updateSparePartSchema.safeParse(req.body);
    if (!parsed.success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', parsed.error.issues);

    const part = await prisma.sparePart.findUnique({ where: { id } });
    if (!part) throw new AppError(404, 'NOT_FOUND', 'Spare part not found');

    if (parsed.data.serialNumber && parsed.data.serialNumber !== part.serialNumber) {
      const exists = await prisma.sparePart.findUnique({
        where: { serialNumber: parsed.data.serialNumber },
      });
      if (exists) throw new AppError(409, 'CONFLICT', 'Serial number already exists');
    }

    const { cost, ...rest } = parsed.data;
    const updated = await prisma.sparePart.update({
      where: { id },
      data: { ...rest, ...(cost !== undefined && { cost: cost ?? null }) },
      include: sparePartInclude,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/spare-parts/:id — ADMIN only
inventoryRouter.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const part = await prisma.sparePart.findUnique({ where: { id } });
    if (!part) throw new AppError(404, 'NOT_FOUND', 'Spare part not found');

    const activeBorrow = await prisma.borrowTransaction.findFirst({
      where: { sparePartId: id, status: { in: ['PENDING', 'APPROVED'] } },
    });
    if (activeBorrow)
      throw new AppError(409, 'CONFLICT', 'Cannot delete — item has an active borrow transaction');

    await prisma.sparePart.delete({ where: { id } });
    res.json({ message: 'Spare part deleted' });
  } catch (err) {
    next(err);
  }
});
