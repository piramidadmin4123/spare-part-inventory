import { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuditLogs } from '@/features/audit-logs/useAuditLogs';
import { ROLE_LABELS } from '@/lib/roles';
import type { AuditLog } from '@spare-part/shared';

const LIMIT = 20;

function fmtDateTime(value?: string | null) {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd/MM/yyyy HH:mm');
  } catch {
    return value;
  }
}

function getRoleLabel(role?: unknown) {
  if (typeof role !== 'string') return null;
  return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role;
}

function describeLog(log: AuditLog): string {
  const oldRole = getRoleLabel((log.oldValue as { role?: unknown } | null)?.role);
  const newRole = getRoleLabel((log.newValue as { role?: unknown } | null)?.role);

  if (log.action === 'UPDATE_ROLE' && oldRole && newRole) {
    return `${oldRole} → ${newRole}`;
  }

  if (log.action === 'APPROVE') return 'อนุมัติคำขอยืม';
  if (log.action === 'REJECT') return 'ปฏิเสธคำขอยืม';
  if (log.action === 'RESTORE') return 'คืนสถานะคำขอยืม';
  if (log.action === 'RETURN') return 'คืนอุปกรณ์';
  if (log.action === 'CANCEL') return 'ยกเลิกคำขอยืม';
  if (log.action === 'DELETE') return 'ลบรายการ';

  return log.entityType;
}

export function SettingsAuditLogsTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditLogs({ page, limit: LIMIT });

  const logs = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{meta?.total ?? 0} log(s)</p>
        <p className="text-xs text-muted-foreground">บันทึกเหตุการณ์สำคัญของระบบ</p>
      </div>

      <div className="overflow-hidden rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>เวลา</TableHead>
              <TableHead>ผู้ทำรายการ</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>รายละเอียด</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  ไม่มีข้อมูล
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {fmtDateTime(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{log.user?.name ?? 'System'}</p>
                      <p className="text-xs text-muted-foreground">{log.user?.email ?? '—'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[420px] text-sm">
                    <p className="font-medium">{describeLog(log)}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.entityType} · {log.entityId}
                    </p>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            แสดง {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)}{' '}
            จาก {meta.total}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center px-2 text-xs">
              {page} / {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
