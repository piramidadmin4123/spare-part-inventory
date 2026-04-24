import { Router } from 'express';
import type { Router as IRouter } from 'express';
import type { Prisma } from '@prisma/client';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';

export const auditLogsRouter: IRouter = Router();

auditLogsRouter.use(requireAuth);

const auditLogInclude = {
  user: { select: { id: true, name: true, email: true, role: true } },
} satisfies Prisma.AuditLogInclude;

// GET /api/audit-logs — ADMIN, SUPER_ADMIN
auditLogsRouter.get('/', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { page = '1', limit = '20' } = req.query as Record<string, string>;
    const p = Math.max(1, parseInt(page, 10));
    const l = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: auditLogInclude,
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * l,
        take: l,
      }),
      prisma.auditLog.count(),
    ]);

    res.json({ data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } });
  } catch (err) {
    next(err);
  }
});
