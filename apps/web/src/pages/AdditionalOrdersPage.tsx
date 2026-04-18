import { useState } from 'react';
import {
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  ShoppingCart,
  CheckCircle2,
  Clock,
  XCircle,
  PackageCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useAdditionalOrders,
  useUpdateOrderStatus,
  useDeleteOrder,
} from '@/features/additional-orders/useAdditionalOrders';
import { useSites } from '@/features/master-data/useMasterData';
import { useAuthStore } from '@/store/auth.store';
import type { AdditionalOrder } from '@/features/additional-orders/api';

const LIMIT = 50;

const STATUS_CONFIG = {
  PENDING: {
    label: 'รอดำเนินการ',
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-gray-500',
  },
  ORDERED: {
    label: 'สั่งซื้อแล้ว',
    icon: ShoppingCart,
    variant: 'default' as const,
    color: 'text-blue-600',
  },
  RECEIVED: {
    label: 'รับของแล้ว',
    icon: PackageCheck,
    variant: 'outline' as const,
    color: 'text-green-600',
  },
  CANCELLED: {
    label: 'ยกเลิก',
    icon: XCircle,
    variant: 'destructive' as const,
    color: 'text-red-500',
  },
};

function StatusBadge({ status }: { status: AdditionalOrder['status'] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

export function AdditionalOrdersPage() {
  const { user } = useAuthStore();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [search, setSearch] = useState('');
  const [siteId, setSiteId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AdditionalOrder | null>(null);

  const filters = {
    ...(search && { search }),
    ...(siteId && { siteId }),
    ...(status && { status }),
    page,
    limit: LIMIT,
  };

  const { data, isLoading } = useAdditionalOrders(filters);
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const { data: sites = [] } = useSites();

  const orders = data?.orders ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  function fmt(n: number | null) {
    if (n == null) return '—';
    return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">รายการสั่งซื้อเพิ่ม</h1>
          <p className="text-sm text-muted-foreground">Additional Orders ({total} รายการ)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อ / รหัส..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={siteId || 'all'}
          onValueChange={(v) => {
            setSiteId(v === 'all' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="ทุก Site" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุก Site</SelectItem>
            {sites.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.code} — {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status || 'all'}
          onValueChange={(v) => {
            setStatus(v === 'all' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="ทุกสถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
              <SelectItem key={val} value={val}>
                {cfg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-10">No.</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Model Code</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead className="w-12 text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Remark</TableHead>
              {canEdit && <TableHead className="w-16 text-center">จัดการ</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 12 : 11} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canEdit ? 12 : 11}
                  className="py-10 text-center text-muted-foreground"
                >
                  ไม่มีข้อมูล
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order, idx) => (
                <TableRow key={order.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {(page - 1) * LIMIT + idx + 1}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {order.site?.code ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{order.type}</TableCell>
                  <TableCell className="text-sm">{order.brand?.name ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{order.modelCode ?? '—'}</TableCell>
                  <TableCell className="max-w-xs">
                    <p className="line-clamp-2 text-sm">{order.productName}</p>
                  </TableCell>
                  <TableCell className="text-right text-sm">{order.quantity}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(order.unitCost)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {fmt(order.totalCost)}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select
                        value={order.status}
                        onValueChange={(v) => updateStatus.mutate({ id: order.id, status: v })}
                      >
                        <SelectTrigger className="h-7 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                            <SelectItem key={val} value={val} className="text-xs">
                              {cfg.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <StatusBadge status={order.status} />
                    )}
                  </TableCell>
                  <TableCell className="max-w-[160px] text-xs text-muted-foreground">
                    <p className="line-clamp-2">{order.remark ?? '—'}</p>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(order)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary + Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex gap-4">
          {Object.entries(STATUS_CONFIG).map(([val, cfg]) => {
            const count = orders.filter((o) => o.status === val).length;
            const Icon = cfg.icon;
            return (
              <span key={val} className={`flex items-center gap-1 ${cfg.color}`}>
                <Icon className="h-3.5 w-3.5" />
                {cfg.label}: {count}
              </span>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <span>
            หน้า {page} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              ลบ "{deleteTarget?.productName}" ออกจากรายการสั่งซื้อ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteOrder.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
