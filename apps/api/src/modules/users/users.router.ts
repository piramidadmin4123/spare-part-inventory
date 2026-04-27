import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { prisma } from '../../lib/prisma.js';
import { isSuperAdminEmail, resolveUserRole, syncFixedSuperAdminRole } from '../../lib/roles.js';
import { recordAuditLog } from '../../lib/audit.js';
import { updateUserRoleSchema } from '@spare-part/shared';

export const usersRouter: IRouter = Router();

usersRouter.use(requireAuth);

// GET /api/users — SUPER_ADMIN only
usersRouter.get('/', requireRole('SUPER_ADMIN'), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        lineUserId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await Promise.all(
      users
        .filter((user) => isSuperAdminEmail(user.email) && user.role !== 'SUPER_ADMIN')
        .map((user) => syncFixedSuperAdminRole(user))
    );

    res.json(
      users.map((user) => ({
        ...user,
        role: resolveUserRole(user.email, user.role),
      }))
    );
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/role — SUPER_ADMIN only
usersRouter.patch('/:id/role', requireRole('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const parsed = updateUserRoleSchema.safeParse(req.body);
    if (!parsed.success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', parsed.error.issues);

    const target = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        phone: true,
        lineUserId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!target) throw new AppError(404, 'NOT_FOUND', 'User not found');
    if (target.id === req.user!.id) {
      throw new AppError(403, 'FORBIDDEN', 'You cannot change your own role');
    }

    if (isSuperAdminEmail(target.email) && parsed.data.role !== 'SUPER_ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'SuperAdmin accounts cannot be downgraded');
    }
    if (!isSuperAdminEmail(target.email) && parsed.data.role === 'SUPER_ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Only the fixed SuperAdmin accounts can use this role');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: parsed.data.role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        lineUserId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await recordAuditLog({
      userId: req.user!.id,
      action: 'UPDATE_ROLE',
      entityType: 'User',
      entityId: updated.id,
      oldValue: { role: target.role },
      newValue: { role: updated.role },
      ipAddress: req.ip,
    }).catch(() => {});

    res.json({ ...updated, role: resolveUserRole(updated.email, updated.role) });
  } catch (err) {
    next(err);
  }
});
