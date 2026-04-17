import { Router } from 'express';
import type { Router as IRouter } from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';
import type { ItemStatus } from '@spare-part/shared';

export const excelRouter: IRouter = Router();

excelRouter.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Status mapping ────────────────────────────────────────────────────────────
function mapStatus(raw: unknown): ItemStatus {
  if (!raw) return 'IN_STOCK';
  const s = String(raw).toLowerCase().trim();
  if (s === 'in_stock' || s === 'in stock') return 'IN_STOCK';
  if (s === 'borrowed') return 'BORROWED';
  if (s === 'maintenance') return 'MAINTENANCE';
  if (s === 'lost') return 'LOST';
  if (s === 'decommissioned') return 'DECOMMISSIONED';
  // "In Service", "onsite", "service bkk", location strings → IN_SERVICE
  return 'IN_SERVICE';
}

// ── POST /api/excel/import ────────────────────────────────────────────────────
excelRouter.post(
  '/import',
  requireRole('ADMIN', 'MANAGER'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError(400, 'VALIDATION_ERROR', 'No file uploaded');

      const siteId = req.body.siteId as string | undefined;
      if (!siteId) throw new AppError(400, 'VALIDATION_ERROR', 'siteId is required');

      const site = await prisma.site.findUnique({ where: { id: siteId } });
      if (!site) throw new AppError(404, 'NOT_FOUND', 'Site not found');

      const wb = new ExcelJS.Workbook();
      const buf = req.file.buffer;
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      await wb.xlsx.load(ab);

      let imported = 0;
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const ws of wb.worksheets) {
        if (!ws.name.toLowerCase().startsWith('spare parts')) continue;

        // Auto-map sheet name → site (e.g. "Spare Parts KIS" → KIS site)
        let sheetSiteId = siteId;
        const sheetSuffix = ws.name.replace(/spare parts\s*/i, '').trim();
        const englishKeyword = sheetSuffix.match(/[A-Za-z_]+/)?.[0];
        if (englishKeyword && englishKeyword.toLowerCase() !== 'all') {
          const matched = await prisma.site.findFirst({
            where: {
              OR: [
                { code: { contains: englishKeyword, mode: 'insensitive' } },
                { name: { contains: englishKeyword, mode: 'insensitive' } },
              ],
            },
          });
          if (matched) sheetSiteId = matched.id;
        }

        // Find header row (contains "PRODUCT NAME")
        let headerRow = -1;
        for (let r = 1; r <= Math.min(ws.rowCount, 15); r++) {
          let found = false;
          ws.getRow(r).eachCell((cell) => {
            if (
              String(cell.value ?? '')
                .toUpperCase()
                .includes('PRODUCT NAME')
            )
              found = true;
          });
          if (found) {
            headerRow = r;
            break;
          }
        }
        if (headerRow < 0) continue;

        // Build column index map
        const colMap: Record<string, number> = {};
        ws.getRow(headerRow).eachCell((cell, col) => {
          const v = String(cell.value ?? '')
            .trim()
            .toLowerCase();
          if (v === 'type' || v.startsWith('type')) colMap.type = col;
          else if (v === 'brand' || v.startsWith('brand')) colMap.brand = col;
          else if (v.includes('material')) colMap.materialCode = col;
          else if (v.includes('code') && v.includes('model')) colMap.modelCode = col;
          else if (v.includes('product name')) colMap.productName = col;
          else if (v === 'qty') colMap.qty = col;
          else if (v.includes('cost')) colMap.cost = col;
          else if (v === 'status') colMap.status = col;
          else if (v.includes('serial') || v.includes('serail')) colMap.serialNumber = col;
          else if (v === 'remark') colMap.remark = col;
        });

        if (!colMap.productName) continue;

        // Unwrap formula cells: ExcelJS returns { formula, result } for formula cells
        const cv = (row: ExcelJS.Row, col: number | undefined): unknown => {
          if (!col) return undefined;
          const v = row.getCell(col).value;
          if (v && typeof v === 'object' && 'result' in v) return (v as { result: unknown }).result;
          return v;
        };

        for (let r = headerRow + 1; r <= ws.rowCount; r++) {
          const row = ws.getRow(r);
          const productName = String(cv(row, colMap.productName) ?? '').trim();
          if (!productName) {
            skipped++;
            continue;
          }

          const typeCode = String(cv(row, colMap.type) ?? '').trim();
          const brandName = String(cv(row, colMap.brand) ?? '').trim();
          const materialCode = String(cv(row, colMap.materialCode) ?? '').trim() || null;
          const modelCode =
            String(cv(row, colMap.modelCode) ?? '').trim() || productName.slice(0, 50);
          const qtyRaw = cv(row, colMap.qty);
          const quantity =
            typeof qtyRaw === 'number' ? qtyRaw : parseInt(String(qtyRaw ?? '1')) || 1;
          const costRaw = cv(row, colMap.cost);
          const cost =
            costRaw != null && costRaw !== '' ? new Prisma.Decimal(String(costRaw)) : null;
          const status = mapStatus(cv(row, colMap.status));
          const serialNumber = String(cv(row, colMap.serialNumber) ?? '').trim() || null;
          const remark = String(cv(row, colMap.remark) ?? '').trim() || null;

          try {
            // Upsert equipment type by code
            if (!typeCode) {
              skipped++;
              continue;
            }
            let equipmentType = await prisma.equipmentType.findFirst({ where: { code: typeCode } });
            if (!equipmentType) {
              equipmentType = await prisma.equipmentType.create({
                data: { code: typeCode, name: typeCode, category: 'Imported' },
              });
            }

            // Upsert brand by name
            if (!brandName) {
              skipped++;
              continue;
            }
            let brand = await prisma.brand.findFirst({ where: { name: brandName } });
            if (!brand) {
              brand = await prisma.brand.create({ data: { name: brandName } });
            }

            // Check if exists by serialNumber
            const existing = serialNumber
              ? await prisma.sparePart.findFirst({ where: { serialNumber } })
              : null;

            if (existing) {
              await prisma.sparePart.update({
                where: { id: existing.id },
                data: {
                  siteId: sheetSiteId,
                  equipmentTypeId: equipmentType.id,
                  brandId: brand.id,
                  materialCode,
                  modelCode,
                  productName,
                  quantity,
                  cost,
                  status,
                  serialNumber,
                  remark,
                },
              });
              updated++;
            } else {
              await prisma.sparePart.create({
                data: {
                  siteId: sheetSiteId,
                  equipmentTypeId: equipmentType.id,
                  brandId: brand.id,
                  materialCode,
                  modelCode,
                  productName,
                  quantity,
                  cost,
                  status,
                  serialNumber,
                  remark,
                },
              });
              imported++;
            }
          } catch (rowErr) {
            errors.push(`Row ${r} (${productName}): ${(rowErr as Error).message}`);
          }
        }
      }

      res.json({ imported, updated, skipped, errors });
    } catch (err) {
      console.error('[IMPORT ERROR]', err);
      next(err);
    }
  }
);

// ── GET /api/excel/export ─────────────────────────────────────────────────────
excelRouter.get('/export', async (req, res, next) => {
  try {
    const { siteId, equipmentTypeId, brandId, status, search } = req.query as Record<
      string,
      string
    >;

    const where: Prisma.SparePartWhereInput = {
      ...(siteId && { siteId }),
      ...(equipmentTypeId && { equipmentTypeId }),
      ...(brandId && { brandId }),
      ...(status && { status: status as ItemStatus }),
      ...(search && {
        OR: [
          { productName: { contains: search, mode: 'insensitive' } },
          { modelCode: { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { materialCode: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const parts = await prisma.sparePart.findMany({
      where,
      include: { site: true, equipmentType: true, brand: true },
      orderBy: [
        { site: { code: 'asc' } },
        { equipmentType: { code: 'asc' } },
        { productName: 'asc' },
      ],
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Spare Part Inventory';
    wb.created = new Date();

    const ws = wb.addWorksheet('Spare Parts Export');

    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F3864' },
    };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };

    ws.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Site', key: 'site', width: 18 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Brand', key: 'brand', width: 14 },
      { header: 'Material Code', key: 'materialCode', width: 20 },
      { header: 'Model Code', key: 'modelCode', width: 20 },
      { header: 'Product Name', key: 'productName', width: 50 },
      { header: 'Qty', key: 'qty', width: 8 },
      { header: 'Cost (THB)', key: 'cost', width: 14 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Serial Number', key: 'serialNumber', width: 22 },
      { header: 'Location', key: 'location', width: 16 },
      { header: 'Remark', key: 'remark', width: 30 },
    ];

    ws.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = borderStyle;
    });
    ws.getRow(1).height = 20;

    parts.forEach((p, idx) => {
      const row = ws.addRow({
        no: idx + 1,
        site: p.site.code,
        type: p.equipmentType.code,
        brand: p.brand.name,
        materialCode: p.materialCode ?? '',
        modelCode: p.modelCode,
        productName: p.productName,
        qty: p.quantity,
        cost: p.cost ? Number(p.cost) : '',
        status: p.status,
        serialNumber: p.serialNumber ?? '',
        location: p.location ?? '',
        remark: p.remark ?? '',
      });
      row.eachCell((cell) => {
        cell.border = borderStyle;
      });
      if (idx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
        });
      }
    });

    const filename = `spare-parts-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

// ── GET /api/excel/template ───────────────────────────────────────────────────
excelRouter.get('/template', async (_req, res, next) => {
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Spare Parts Import');

    ws.columns = [
      { header: 'Type (Code)', key: 'type', width: 14 },
      { header: 'Brand', key: 'brand', width: 14 },
      { header: 'Material Code', key: 'materialCode', width: 20 },
      { header: 'Code (Model)', key: 'modelCode', width: 20 },
      { header: 'PRODUCT NAME', key: 'productName', width: 50 },
      { header: 'Qty', key: 'qty', width: 8 },
      { header: 'Cost (Total)', key: 'cost', width: 14 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Serail Number', key: 'serialNumber', width: 22 },
      { header: 'Remark', key: 'remark', width: 30 },
    ];

    ws.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(1).height = 20;

    ws.addRow({
      type: 'AP-A',
      brand: 'Aruba',
      materialCode: 'ONWS005C500001',
      modelCode: 'IAP-103-RW',
      productName: 'ARUBA INSTANT IAP-103 WIRELESS ACCESS POINT',
      qty: 1,
      cost: 3700,
      status: 'In Service',
      serialNumber: 'CU0407405',
      remark: '',
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="spare-parts-template.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});
