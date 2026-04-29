import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { buildAdditionalOrderKey } from '../../lib/additional-order-key.js';

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

    const [rawOrders, total] = await Promise.all([
      prisma.additionalOrder.findMany({
        where,
        select: {
          id: true,
          siteId: true,
          brandId: true,
          type: true,
          modelCode: true,
          productName: true,
          quantity: true,
          unitCost: true,
          totalCost: true,
          status: true,
          remark: true,
          createdAt: true,
          updatedAt: true,
          imageData: true,
          site: { select: { id: true, code: true, name: true } },
          brand: { select: { id: true, name: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
        take,
        skip,
      }),
      prisma.additionalOrder.count({ where }),
    ]);

    const orders = rawOrders.map(({ imageData, ...rest }) => ({
      ...rest,
      hasImage: !!imageData,
    }));
    res.json({ orders, total, page: parseInt(page), limit: take });
  } catch (err) {
    next(err);
  }
});

// GET /api/additional-orders/:id/image
additionalOrdersRouter.get('/:id/image', async (req, res, next) => {
  try {
    const order = await prisma.additionalOrder.findUnique({
      where: { id: String(req.params.id) },
      select: { imageData: true },
    });
    if (!order?.imageData) throw new AppError(404, 'NOT_FOUND', 'No image for this order');
    res.json({ imageData: order.imageData });
  } catch (err) {
    next(err);
  }
});

// ── helpers ──────────────────────────────────────────────────────────────────
async function resolveBrand(brandName: string | undefined) {
  if (!brandName?.trim()) return null;
  const name = brandName.trim();
  let brand = await prisma.brand.findFirst({ where: { name } });
  if (!brand) brand = await prisma.brand.create({ data: { name } });
  return brand;
}

async function hasDuplicateAdditionalOrder(
  candidate: {
    siteId: string | null;
    brandName: string | null;
    type: string;
    modelCode: string | null;
    productName: string;
    quantity: number;
    unitCost: Prisma.Decimal | null;
    totalCost: Prisma.Decimal | null;
    remark: string | null;
  },
  excludeId?: string
) {
  const existingOrders = await prisma.additionalOrder.findMany({
    where: {
      siteId: candidate.siteId,
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: {
      id: true,
      siteId: true,
      type: true,
      modelCode: true,
      productName: true,
      quantity: true,
      unitCost: true,
      totalCost: true,
      remark: true,
      brand: { select: { name: true } },
    },
  });

  const candidateKey = buildAdditionalOrderKey(candidate);
  return existingOrders.some(
    (order) =>
      buildAdditionalOrderKey({
        siteId: order.siteId,
        brandName: order.brand?.name ?? null,
        type: order.type,
        modelCode: order.modelCode,
        productName: order.productName,
        quantity: order.quantity,
        unitCost: order.unitCost,
        totalCost: order.totalCost,
        remark: order.remark,
      }) === candidateKey
  );
}

function normalizeImageData(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || null;
}

function toDecimal(v: unknown) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : new Prisma.Decimal(n);
}

const VALID_STATUSES = ['PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED'] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

// POST /api/additional-orders
additionalOrdersRouter.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const {
      siteId,
      type,
      brandName,
      modelCode,
      productName,
      quantity,
      unitCost,
      totalCost,
      status = 'PENDING',
      remark,
      imageData,
    } = req.body as Record<string, unknown>;

    if (!productName || String(productName).trim() === '')
      throw new AppError(400, 'VALIDATION_ERROR', 'productName is required');
    if (status && !VALID_STATUSES.includes(status as OrderStatus))
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid status');

    const brand = await resolveBrand(brandName as string | undefined);
    const normalizedImageData = normalizeImageData(imageData);
    const siteIdValue = (siteId as string) || null;
    const duplicate = await hasDuplicateAdditionalOrder({
      siteId: siteIdValue,
      brandName: brand?.name ?? (brandName as string | undefined) ?? null,
      type: String(type ?? '').trim() || 'Unknown',
      modelCode: String(modelCode ?? '').trim() || null,
      productName: String(productName).trim(),
      quantity: parseInt(String(quantity ?? 1)) || 1,
      unitCost: toDecimal(unitCost),
      totalCost: toDecimal(totalCost),
      remark: String(remark ?? '').trim() || null,
    });
    if (duplicate) {
      throw new AppError(409, 'CONFLICT', 'Duplicate additional order already exists');
    }

    const order = await prisma.additionalOrder.create({
      data: {
        siteId: siteIdValue,
        brandId: brand?.id ?? null,
        type: String(type ?? '').trim() || 'Unknown',
        modelCode: String(modelCode ?? '').trim() || null,
        productName: String(productName).trim(),
        quantity: parseInt(String(quantity ?? 1)) || 1,
        unitCost: toDecimal(unitCost),
        totalCost: toDecimal(totalCost),
        status: (status as OrderStatus) ?? 'PENDING',
        remark: String(remark ?? '').trim() || null,
        ...(normalizedImageData !== undefined && { imageData: normalizedImageData }),
      },
      select: {
        id: true,
        siteId: true,
        brandId: true,
        type: true,
        modelCode: true,
        productName: true,
        quantity: true,
        unitCost: true,
        totalCost: true,
        status: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
        site: { select: { id: true, code: true, name: true } },
        brand: { select: { id: true, name: true } },
      },
    });
    res.status(201).json({ ...order, hasImage: !!normalizedImageData });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/additional-orders/:id — full update
additionalOrdersRouter.patch('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const {
      siteId,
      type,
      brandName,
      modelCode,
      productName,
      quantity,
      unitCost,
      totalCost,
      status,
      remark,
      imageData: imageDataInput,
    } = req.body as Record<string, unknown>;

    if (status && !VALID_STATUSES.includes(status as OrderStatus))
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid status');

    const part = await prisma.additionalOrder.findUnique({
      where: { id: String(req.params.id) },
      include: { brand: { select: { name: true } } },
    });
    if (!part) throw new AppError(404, 'NOT_FOUND', 'Additional order not found');

    const brand = brandName !== undefined ? await resolveBrand(brandName as string) : undefined;
    const normalizedImageData = normalizeImageData(imageDataInput);
    const nextSiteId = siteId !== undefined ? (siteId as string) || null : part.siteId;
    const nextBrandName =
      brandName !== undefined ? (brand?.name ?? null) : (part.brand?.name ?? null);
    const nextType = type !== undefined ? String(type).trim() || 'Unknown' : part.type;
    const nextModelCode =
      modelCode !== undefined ? String(modelCode).trim() || null : part.modelCode;
    const nextProductName =
      productName !== undefined ? String(productName).trim() : part.productName;
    const nextQuantity = quantity !== undefined ? parseInt(String(quantity)) || 1 : part.quantity;
    const nextUnitCost = unitCost !== undefined ? toDecimal(unitCost) : part.unitCost;
    const nextTotalCost = totalCost !== undefined ? toDecimal(totalCost) : part.totalCost;
    const nextRemark = remark !== undefined ? String(remark).trim() || null : part.remark;

    const duplicate = await hasDuplicateAdditionalOrder(
      {
        siteId: nextSiteId,
        brandName: nextBrandName,
        type: nextType,
        modelCode: nextModelCode,
        productName: nextProductName,
        quantity: nextQuantity,
        unitCost: nextUnitCost,
        totalCost: nextTotalCost,
        remark: nextRemark,
      },
      part.id
    );
    if (duplicate) {
      throw new AppError(409, 'CONFLICT', 'Duplicate additional order already exists');
    }

    const order = await prisma.additionalOrder.update({
      where: { id: String(req.params.id) },
      data: {
        ...(siteId !== undefined && { siteId: nextSiteId }),
        ...(type !== undefined && { type: nextType }),
        ...(brand !== undefined && { brandId: brand?.id ?? null }),
        ...(modelCode !== undefined && { modelCode: nextModelCode }),
        ...(productName !== undefined && { productName: nextProductName }),
        ...(quantity !== undefined && { quantity: nextQuantity }),
        ...(unitCost !== undefined && { unitCost: nextUnitCost }),
        ...(totalCost !== undefined && { totalCost: nextTotalCost }),
        ...(status != null && status !== '' && { status: status as OrderStatus }),
        ...(remark !== undefined && { remark: nextRemark }),
        ...(normalizedImageData !== undefined && { imageData: normalizedImageData }),
      },
      select: {
        id: true,
        siteId: true,
        brandId: true,
        type: true,
        modelCode: true,
        productName: true,
        quantity: true,
        unitCost: true,
        totalCost: true,
        status: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
        imageData: true,
        site: { select: { id: true, code: true, name: true } },
        brand: { select: { id: true, name: true } },
      },
    });
    const { imageData, ...rest } = order;
    res.json({ ...rest, hasImage: !!imageData });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/additional-orders/:id
additionalOrdersRouter.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    await prisma.additionalOrder.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
