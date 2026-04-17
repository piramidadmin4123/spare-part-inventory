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
      let borrowsImported = 0;
      const errors: string[] = [];

      const parseDate = (raw: unknown): Date | null => {
        if (!raw) return null;
        if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
        const s = String(raw).trim();
        if (!s) return null;
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
      };

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
          else if (v === 'name') colMap.borrowerName = col;
          else if (v.includes('date start')) colMap.borrowDateStart = col;
          else if (v.includes('date end')) colMap.borrowDateEnd = col;
          else if (v === 'project') colMap.borrowProject = col;
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

            let partId: string;
            if (existing) {
              const up = await prisma.sparePart.update({
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
              partId = up.id;
              updated++;
            } else {
              const cr = await prisma.sparePart.create({
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
              partId = cr.id;
              imported++;
            }

            // ── Borrow data (columns Name / Date Start / Date End / Project) ──
            const borrowerName = String(cv(row, colMap.borrowerName) ?? '').trim();
            const looksLikeDate = /^\d+[/\-]\d+[/\-]\d+$/.test(borrowerName);
            if (borrowerName && !looksLikeDate) {
              const cleanName = borrowerName.replace(/^[PN]'\s*/i, '').trim();
              let borrower = await prisma.user.findFirst({
                where: { name: { contains: cleanName, mode: 'insensitive' } },
              });
              if (!borrower && cleanName !== borrowerName) {
                borrower = await prisma.user.findFirst({
                  where: { name: { contains: borrowerName, mode: 'insensitive' } },
                });
              }
              const borrowerId = borrower?.id ?? req.user!.id;
              const borrowerRemark = borrower ? null : `ผู้ยืม (นำเข้า): ${borrowerName}`;

              const dateStart = parseDate(cv(row, colMap.borrowDateStart));
              const dateEnd = parseDate(cv(row, colMap.borrowDateEnd));
              const borrowProject = String(cv(row, colMap.borrowProject) ?? '').trim() || null;

              const existingBorrow = await prisma.borrowTransaction.findFirst({
                where: { sparePartId: partId, status: { in: ['APPROVED', 'PENDING'] } },
              });
              if (!existingBorrow) {
                await prisma.borrowTransaction.create({
                  data: {
                    sparePartId: partId,
                    borrowerId,
                    approverId: req.user!.id,
                    status: dateEnd ? 'RETURNED' : 'APPROVED',
                    project: borrowProject,
                    dateStart,
                    expectedReturn: dateEnd,
                    actualReturn: dateEnd,
                    borrowerRemark,
                  },
                });
                borrowsImported++;
              }
            }
          } catch (rowErr) {
            errors.push(`Row ${r} (${productName}): ${(rowErr as Error).message}`);
          }
        }
      }

      // ── Additional Order sheets ──────────────────────────────────────────
      let ordersImported = 0;
      for (const ws of wb.worksheets) {
        if (!ws.name.toLowerCase().startsWith('additional order')) continue;

        // Auto-map sheet → site (e.g. "Additional Order BKK" → BKK)
        const keyword = ws.name
          .replace(/additional order\s*/i, '')
          .trim()
          .match(/[A-Za-z]+/)?.[0];
        let aoSiteId: string | null = null;
        if (keyword) {
          const s = await prisma.site.findFirst({
            where: {
              OR: [
                { code: { contains: keyword, mode: 'insensitive' } },
                { name: { contains: keyword, mode: 'insensitive' } },
              ],
            },
          });
          if (s) aoSiteId = s.id;
        }

        // Find header row
        let aoHeader = -1;
        for (let r = 1; r <= 10; r++) {
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
            aoHeader = r;
            break;
          }
        }
        if (aoHeader < 0) continue;

        // Column map
        const aoCol: Record<string, number> = {};
        ws.getRow(aoHeader).eachCell((cell, col) => {
          const v = String(cell.value ?? '')
            .trim()
            .toLowerCase();
          if (v === 'type') aoCol.type = col;
          else if (v === 'brand') aoCol.brand = col;
          else if (v === 'code') aoCol.modelCode = col;
          else if (v.includes('product name')) aoCol.productName = col;
          else if (v === 'qty') aoCol.qty = col;
          else if (v.includes('cost') && !v.includes('total')) aoCol.unitCost = col;
          else if (v.includes('total') && v.includes('cost')) aoCol.totalCost = col;
          else if (v === 'remark') aoCol.remark = col;
        });
        if (!aoCol.productName) continue;

        const aoCv = (row: ExcelJS.Row, col: number | undefined): unknown => {
          if (!col) return undefined;
          const v = row.getCell(col).value;
          if (v && typeof v === 'object' && 'result' in v) return (v as { result: unknown }).result;
          return v;
        };

        for (let r = aoHeader + 1; r <= ws.rowCount; r++) {
          const row = ws.getRow(r);
          const productName = String(aoCv(row, aoCol.productName) ?? '').trim();
          if (!productName) continue;
          const type = String(aoCv(row, aoCol.type) ?? '').trim() || 'Unknown';
          const brandName = String(aoCv(row, aoCol.brand) ?? '').trim();
          const modelCode = String(aoCv(row, aoCol.modelCode) ?? '').trim() || null;
          const qtyRaw = aoCv(row, aoCol.qty);
          const quantity =
            typeof qtyRaw === 'number' ? qtyRaw : parseInt(String(qtyRaw ?? '1')) || 1;
          const unitCostRaw = aoCv(row, aoCol.unitCost);
          const unitCost =
            unitCostRaw != null && unitCostRaw !== ''
              ? new Prisma.Decimal(String(unitCostRaw))
              : null;
          const totalCostRaw = aoCv(row, aoCol.totalCost);
          const totalCost =
            totalCostRaw != null && totalCostRaw !== ''
              ? new Prisma.Decimal(String(totalCostRaw))
              : null;
          const remark = String(aoCv(row, aoCol.remark) ?? '').trim() || null;

          try {
            let brand = brandName
              ? await prisma.brand.findFirst({ where: { name: brandName } })
              : null;
            if (!brand && brandName)
              brand = await prisma.brand.create({ data: { name: brandName } });

            await prisma.additionalOrder.create({
              data: {
                siteId: aoSiteId,
                brandId: brand?.id ?? null,
                type,
                modelCode,
                productName,
                quantity,
                unitCost,
                totalCost,
                status: 'PENDING',
                remark,
              },
            });
            ordersImported++;
          } catch (rowErr) {
            errors.push(`AO Row ${r} (${productName}): ${(rowErr as Error).message}`);
          }
        }
      }

      res.json({ imported, updated, skipped, ordersImported, borrowsImported, errors });
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

// ── GET /api/excel/borrow-export ─────────────────────────────────────────────
excelRouter.get('/borrow-export', async (req, res, next) => {
  try {
    const { status } = req.query as Record<string, string>;

    const txs = await prisma.borrowTransaction.findMany({
      where: { ...(status && { status: status as Prisma.EnumBorrowStatusFilter }) },
      include: {
        sparePart: { include: { site: true, equipmentType: true, brand: true } },
        borrower: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Spare Part Inventory';
    wb.created = new Date();
    const ws = wb.addWorksheet('Borrow Transactions');

    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F3864' },
    };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    const border: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };

    ws.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Model Code', key: 'modelCode', width: 20 },
      { header: 'Product Name', key: 'productName', width: 46 },
      { header: 'Site', key: 'site', width: 12 },
      { header: 'Serial Number', key: 'serialNumber', width: 22 },
      { header: 'Borrower Name', key: 'borrowerName', width: 20 },
      { header: 'Borrower Email', key: 'borrowerEmail', width: 28 },
      { header: 'Project', key: 'project', width: 24 },
      { header: 'Date Start', key: 'dateStart', width: 18 },
      { header: 'Expected Return', key: 'expectedReturn', width: 18 },
      { header: 'Actual Return', key: 'actualReturn', width: 18 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Remark', key: 'remark', width: 32 },
    ];

    ws.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = border;
    });
    ws.getRow(1).height = 20;

    const fmt = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : '');

    txs.forEach((tx, idx) => {
      const row = ws.addRow({
        no: idx + 1,
        modelCode: tx.sparePart.modelCode,
        productName: tx.sparePart.productName,
        site: tx.sparePart.site.code,
        serialNumber: tx.sparePart.serialNumber ?? '',
        borrowerName: tx.borrower.name,
        borrowerEmail: tx.borrower.email,
        project: tx.project ?? '',
        dateStart: fmt(tx.dateStart),
        expectedReturn: fmt(tx.expectedReturn),
        actualReturn: fmt(tx.actualReturn),
        status: tx.status,
        remark: tx.borrowerRemark ?? '',
      });
      row.eachCell((cell) => {
        cell.border = border;
      });
      if (idx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
        });
      }
    });

    const filename = `borrow-transactions-${new Date().toISOString().slice(0, 10)}.xlsx`;
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

// ── GET /api/excel/borrow-template ───────────────────────────────────────────
excelRouter.get('/borrow-template', async (_req, res, next) => {
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Borrow Import');

    ws.columns = [
      { header: 'Borrower Email', key: 'borrowerEmail', width: 28 },
      { header: 'Model Code', key: 'modelCode', width: 20 },
      { header: 'Serial Number', key: 'serialNumber', width: 22 },
      { header: 'Project', key: 'project', width: 24 },
      { header: 'Date Start (YYYY-MM-DD)', key: 'dateStart', width: 24 },
      { header: 'Expected Return (YYYY-MM-DD)', key: 'expectedReturn', width: 28 },
      { header: 'Actual Return (YYYY-MM-DD)', key: 'actualReturn', width: 26 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Remark', key: 'remark', width: 30 },
    ];

    ws.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(1).height = 20;

    // Sample row
    ws.addRow({
      borrowerEmail: 'technician@example.com',
      modelCode: 'IAP-103-RW',
      serialNumber: 'CU0407405',
      project: 'Capella Hotel Migration',
      dateStart: '2025-01-15',
      expectedReturn: '2025-02-15',
      actualReturn: '',
      status: 'APPROVED',
      remark: '',
    });

    // Note row
    const noteRow = ws.addRow([
      'Status values: PENDING | APPROVED | RETURNED | CANCELLED | REJECTED',
    ]);
    noteRow.getCell(1).font = { italic: true, color: { argb: 'FF888888' } };
    ws.mergeCells(`A${noteRow.number}:I${noteRow.number}`);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="borrow-template.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

// ── POST /api/excel/borrow-import ─────────────────────────────────────────────
excelRouter.post(
  '/borrow-import',
  requireRole('ADMIN', 'MANAGER'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError(400, 'VALIDATION_ERROR', 'No file uploaded');

      const wb = new ExcelJS.Workbook();
      const buf = req.file.buffer;
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      await wb.xlsx.load(ab);

      let imported = 0;
      const errors: string[] = [];

      const cv = (row: ExcelJS.Row, col: number | undefined): unknown => {
        if (!col) return undefined;
        const v = row.getCell(col).value;
        if (v && typeof v === 'object' && 'result' in v) return (v as { result: unknown }).result;
        return v;
      };

      const parseDate = (raw: unknown): Date | null => {
        if (!raw) return null;
        if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
        const s = String(raw).trim();
        if (!s) return null;
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
      };

      for (const ws of wb.worksheets) {
        // ── Format A: Original Excel ("Spare Parts *" sheets with Name/Date Start cols) ──
        if (ws.name.toLowerCase().startsWith('spare parts')) {
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

          const colMap: Record<string, number> = {};
          ws.getRow(headerRow).eachCell((cell, col) => {
            const v = String(cell.value ?? '')
              .trim()
              .toLowerCase();
            if (v.includes('serial') || v.includes('serail')) colMap.serialNumber = col;
            else if (v.includes('code') && (v.includes('model') || v === 'code'))
              colMap.modelCode = col;
            else if (v === 'name') colMap.borrowerName = col;
            else if (v.includes('date start')) colMap.dateStart = col;
            else if (v.includes('date end')) colMap.dateEnd = col;
            else if (v === 'project') colMap.project = col;
          });

          if (!colMap.borrowerName) continue;

          for (let r = headerRow + 1; r <= ws.rowCount; r++) {
            const row = ws.getRow(r);
            const borrowerName = String(cv(row, colMap.borrowerName) ?? '').trim();
            const looksLikeDate = /^\d+[/\-]\d+[/\-]\d+$/.test(borrowerName);
            if (!borrowerName || looksLikeDate) continue;

            const serialNumber = String(cv(row, colMap.serialNumber) ?? '').trim();
            const modelCode = String(cv(row, colMap.modelCode) ?? '').trim();
            if (!serialNumber && !modelCode) continue;

            try {
              const sparePart = serialNumber
                ? await prisma.sparePart.findFirst({ where: { serialNumber } })
                : await prisma.sparePart.findFirst({ where: { modelCode } });
              if (!sparePart) {
                errors.push(
                  `Row ${r} [${ws.name}]: ไม่พบ spare part (${serialNumber || modelCode})`
                );
                continue;
              }

              const existingBorrow = await prisma.borrowTransaction.findFirst({
                where: { sparePartId: sparePart.id, status: { in: ['APPROVED', 'PENDING'] } },
              });
              if (existingBorrow) continue;

              const cleanName = borrowerName.replace(/^[PN]'\s*/i, '').trim();
              let borrower = await prisma.user.findFirst({
                where: { name: { contains: cleanName, mode: 'insensitive' } },
              });
              if (!borrower && cleanName !== borrowerName) {
                borrower = await prisma.user.findFirst({
                  where: { name: { contains: borrowerName, mode: 'insensitive' } },
                });
              }
              const borrowerId = borrower?.id ?? req.user!.id;
              const borrowerRemark = borrower ? null : `ผู้ยืม (นำเข้า): ${borrowerName}`;

              const dateStart = parseDate(cv(row, colMap.dateStart));
              const dateEnd = parseDate(cv(row, colMap.dateEnd));
              const project = String(cv(row, colMap.project) ?? '').trim() || null;

              await prisma.borrowTransaction.create({
                data: {
                  sparePartId: sparePart.id,
                  borrowerId,
                  approverId: req.user!.id,
                  status: dateEnd ? 'RETURNED' : 'APPROVED',
                  project,
                  dateStart,
                  expectedReturn: dateEnd,
                  actualReturn: dateEnd,
                  borrowerRemark,
                },
              });
              imported++;
            } catch (rowErr) {
              errors.push(`Row ${r} [${ws.name}]: ${(rowErr as Error).message}`);
            }
          }
          continue;
        }

        // ── Format B: Template format ("Borrower Email" column) ──
        let headerRow = -1;
        for (let r = 1; r <= Math.min(ws.rowCount, 10); r++) {
          let found = false;
          ws.getRow(r).eachCell((cell) => {
            if (
              String(cell.value ?? '')
                .toLowerCase()
                .includes('borrower email')
            )
              found = true;
          });
          if (found) {
            headerRow = r;
            break;
          }
        }
        if (headerRow < 0) continue;

        const colMap: Record<string, number> = {};
        ws.getRow(headerRow).eachCell((cell, col) => {
          const v = String(cell.value ?? '')
            .trim()
            .toLowerCase();
          if (v.includes('borrower email')) colMap.borrowerEmail = col;
          else if (v.includes('model code')) colMap.modelCode = col;
          else if (v.includes('serial')) colMap.serialNumber = col;
          else if (v.includes('project')) colMap.project = col;
          else if (v.includes('date start')) colMap.dateStart = col;
          else if (v.includes('expected return')) colMap.expectedReturn = col;
          else if (v.includes('actual return')) colMap.actualReturn = col;
          else if (v === 'status') colMap.status = col;
          else if (v === 'remark') colMap.remark = col;
        });

        if (!colMap.borrowerEmail || !colMap.modelCode) continue;

        const mapBorrowStatus = (
          raw: unknown
        ): 'PENDING' | 'APPROVED' | 'RETURNED' | 'CANCELLED' | 'REJECTED' => {
          const s = String(raw ?? '')
            .toUpperCase()
            .trim();
          if (['PENDING', 'APPROVED', 'RETURNED', 'CANCELLED', 'REJECTED'].includes(s))
            return s as 'PENDING' | 'APPROVED' | 'RETURNED' | 'CANCELLED' | 'REJECTED';
          return 'PENDING';
        };

        for (let r = headerRow + 1; r <= ws.rowCount; r++) {
          const row = ws.getRow(r);
          const borrowerEmail = String(cv(row, colMap.borrowerEmail) ?? '').trim();
          const modelCode = String(cv(row, colMap.modelCode) ?? '').trim();
          if (!borrowerEmail || !modelCode) continue;
          if (
            String(cv(row, 1) ?? '')
              .toLowerCase()
              .includes('status values')
          )
            continue;

          try {
            const borrower = await prisma.user.findUnique({ where: { email: borrowerEmail } });
            if (!borrower) {
              errors.push(`Row ${r}: ไม่พบ user (${borrowerEmail})`);
              continue;
            }

            const serialNumber = String(cv(row, colMap.serialNumber) ?? '').trim();
            const sparePart = serialNumber
              ? await prisma.sparePart.findFirst({ where: { serialNumber } })
              : await prisma.sparePart.findFirst({ where: { modelCode } });
            if (!sparePart) {
              errors.push(`Row ${r}: ไม่พบ spare part (${modelCode})`);
              continue;
            }

            await prisma.borrowTransaction.create({
              data: {
                sparePartId: sparePart.id,
                borrowerId: borrower.id,
                approverId: req.user!.id,
                status: mapBorrowStatus(cv(row, colMap.status)),
                project: String(cv(row, colMap.project) ?? '').trim() || null,
                dateStart: parseDate(cv(row, colMap.dateStart)),
                expectedReturn: parseDate(cv(row, colMap.expectedReturn)),
                actualReturn: parseDate(cv(row, colMap.actualReturn)),
                borrowerRemark: String(cv(row, colMap.remark) ?? '').trim() || null,
              },
            });
            imported++;
          } catch (rowErr) {
            errors.push(`Row ${r}: ${(rowErr as Error).message}`);
          }
        }
      }

      res.json({ imported, errors });
    } catch (err) {
      console.error('[BORROW IMPORT ERROR]', err);
      next(err);
    }
  }
);

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
