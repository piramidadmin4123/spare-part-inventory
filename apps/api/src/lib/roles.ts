import type { UserRole } from '@prisma/client';

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
