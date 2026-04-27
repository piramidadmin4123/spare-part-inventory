import { apiClient } from '@/lib/api-client';
import type { AuditLog, PaginatedResponse } from '@spare-part/shared';

export interface AuditLogFilters {
  page?: number;
  limit?: number;
}

export const auditLogsApi = {
  list: (params: AuditLogFilters = {}) =>
    apiClient.get<PaginatedResponse<AuditLog>>('/api/audit-logs', { params }),
};
