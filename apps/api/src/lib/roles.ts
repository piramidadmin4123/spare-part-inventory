import type { UserRole } from '@prisma/client';
import { prisma } from './prisma.js';

export const SUPER_ADMIN_EMAILS = [
  'piramidadmin4123@gmail.com',
  'pongsak@psolutions.co.th',
] as const;

const SUPER_ADMIN_EMAIL_SET = new Set<string>(SUPER_ADMIN_EMAILS);

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAIL_SET.has(email.toLowerCase());
}

export function resolveUserRole(email: string, role: UserRole): UserRole {
  return isSuperAdminEmail(email) ? 'SUPER_ADMIN' : role;
}

export function isSuperAdminRole(role?: UserRole | null): boolean {
  return role === 'SUPER_ADMIN';
}

export async function syncFixedSuperAdminRole<
  T extends { id: string; email: string; role: UserRole },
>(user: T): Promise<T> {
  if (!isSuperAdminEmail(user.email) || user.role === 'SUPER_ADMIN') {
    return user;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'SUPER_ADMIN' },
  });

  return { ...user, role: 'SUPER_ADMIN' };
}
