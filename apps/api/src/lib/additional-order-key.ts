import { Prisma } from '@prisma/client';

export type AdditionalOrderKeyInput = {
  siteId?: string | null;
  brandName?: string | null;
  type?: string | null;
  modelCode?: string | null;
  productName?: string | null;
  quantity?: number | string | null;
  unitCost?: Prisma.Decimal | number | string | null;
  totalCost?: Prisma.Decimal | number | string | null;
  remark?: string | null;
};

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeQuantity(value: unknown): string {
  const parsed = Number(String(value ?? '1'));
  if (!Number.isFinite(parsed)) return '1';
  const normalized = Math.trunc(parsed);
  return String(normalized || 1);
}

function normalizeDecimal(value: unknown): string {
  if (value == null || value === '') return '';
  try {
    return new Prisma.Decimal(value as Prisma.Decimal.Value).toFixed(2);
  } catch {
    return normalizeText(value);
  }
}

export function buildAdditionalOrderKey(input: AdditionalOrderKeyInput): string {
  return [
    normalizeText(input.siteId),
    normalizeText(input.brandName),
    normalizeText(input.type),
    normalizeText(input.modelCode),
    normalizeText(input.productName),
    normalizeQuantity(input.quantity),
    normalizeDecimal(input.unitCost),
    normalizeDecimal(input.totalCost),
    normalizeText(input.remark),
  ].join('|');
}
