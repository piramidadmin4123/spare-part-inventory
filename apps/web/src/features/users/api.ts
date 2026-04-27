import { apiClient } from '@/lib/api-client';
import type { User, UserRole } from '@spare-part/shared';

export const usersApi = {
  list: () => apiClient.get<User[]>('/api/users'),
  updateRole: (id: string, role: UserRole) =>
    apiClient.patch<User>(`/api/users/${id}/role`, { role }),
};
