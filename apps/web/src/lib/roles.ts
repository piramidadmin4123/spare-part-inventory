import type { UserRole } from '@spare-part/shared';

export const SUPER_ADMIN_EMAILS = [
  'piramidadmin4123@gmail.com',
  'pongsak@psolutions.co.th',
] as const;

const SUPER_ADMIN_EMAIL_SET = new Set<string>(SUPER_ADMIN_EMAILS);

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  TECHNICIAN: 'Technician',
  VIEWER: 'Viewer',
};

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAIL_SET.has(email.toLowerCase());
}

export function isSuperAdminRole(role?: UserRole | null): boolean {
  return role === 'SUPER_ADMIN';
}

export function isAdminLikeRole(role?: UserRole | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MANAGER';
}

export function canAccessSettings(role?: UserRole | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}
