import { useQuery } from '@tanstack/react-query';
import { auditLogsApi, type AuditLogFilters } from './api';

export const AUDIT_LOGS_KEY = ['audit-logs'] as const;

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: [...AUDIT_LOGS_KEY, filters],
    queryFn: () => auditLogsApi.list(filters).then((r) => r.data),
  });
}
