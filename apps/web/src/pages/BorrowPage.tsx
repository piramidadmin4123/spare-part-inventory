import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import {
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  RotateCcw,
  Ban,
  Upload,
  Download,
  FileSpreadsheet,
  Pencil,
  Trash2,
} from 'lucide-react';
import { borrowRequestSchema, editBorrowSchema } from '@spare-part/shared';
import type { BorrowRequestInput, EditBorrowInput, BorrowTransaction } from '@spare-part/shared';
import { excelApi } from '@/features/excel/api';
import type { BorrowImportResult } from '@/features/excel/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useBorrows,
  useCreateBorrow,
  useApproveBorrow,
  useRejectBorrow,
  useReturnBorrow,
  useCancelBorrow,
  useUpdateBorrow,
  useDeleteBorrow,
  BORROW_KEY,
} from '@/features/borrow/useBorrow';
import { useQueryClient } from '@tanstack/react-query';
import { useSpareParts } from '@/features/inventory/useInventory';
import { useAuthStore } from '@/store/auth.store';

// ── Status config ──────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'รออนุมัติ' },
  { value: 'APPROVED', label: 'อนุมัติแล้ว' },
  { value: 'REJECTED', label: 'ปฏิเสธ' },
  { value: 'RETURNED', label: 'คืนแล้ว' },
  { value: 'CANCELLED', label: 'ยกเลิก' },
];

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDING: 'outline',
  APPROVED: 'default',
  REJECTED: 'destructive',
  RETURNED: 'secondary',
  CANCELLED: 'secondary',
};

function StatusBadge({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status);
  return (
    <Badge
      variant={STATUS_VARIANT[status] ?? 'secondary'}
      className="whitespace-nowrap px-2 py-0.5 text-[11px] leading-none"
    >
      {opt?.label ?? status}
    </Badge>
  );
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd/MM/yyyy');
  } catch {
    return d;
  }
}

function getOverdueDays(expectedReturn?: string | null, now = Date.now()) {
  if (!expectedReturn) return 0;

  const overdueMs = now - new Date(expectedReturn).getTime();
  if (overdueMs <= 0) return 0;

  return Math.max(1, Math.ceil(overdueMs / (1000 * 60 * 60 * 24)));
}

function fmtDateTime(d?: string | null) {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd/MM/yyyy HH:mm');
  } catch {
    return d;
  }
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm leading-snug text-foreground">{value}</div>
    </div>
  );
}

// ── Create Borrow Dialog ───────────────────────────────────────────────────

function CreateBorrowDialog({
  open,
  onOpenChange,
  initialSparePartId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialSparePartId?: string | null;
}) {
  const { user } = useAuthStore();
  const createBorrow = useCreateBorrow();
  const { data: partsData } = useSpareParts(
    { status: 'IN_STOCK', limit: 100 },
    {
      enabled: open,
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: 'always',
      refetchOnReconnect: 'always',
    }
  );
  const parts = partsData?.data ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    resetField,
    reset,
    formState: { errors },
  } = useForm<BorrowRequestInput>({
    resolver: zodResolver(borrowRequestSchema),
    defaultValues: {
      borrowerName: user?.name ?? '',
      borrowerEmail: user?.email ?? '',
    },
  });
  const selectedSparePartId = watch('sparePartId');
  const dateStartValue = watch('dateStart');

  useEffect(() => {
    if (!open) return;

    if (initialSparePartId) {
      setValue('sparePartId', initialSparePartId, { shouldDirty: true, shouldValidate: true });
      return;
    }

    resetField('sparePartId');
  }, [open, initialSparePartId, resetField, setValue]);

  function onSubmit(data: BorrowRequestInput) {
    createBorrow.mutate(data, {
      onSuccess: () => {
        reset({ borrowerName: user?.name ?? '', borrowerEmail: user?.email ?? '' });
        onOpenChange(false);
      },
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset({ borrowerName: user?.name ?? '', borrowerEmail: user?.email ?? '' });
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>ขอยืม Spare Part</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Spare Part *</Label>
            <Select
              value={selectedSparePartId ?? ''}
              onValueChange={(v) => setValue('sparePartId', v, { shouldDirty: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกอุปกรณ์ที่ต้องการยืม" />
              </SelectTrigger>
              <SelectContent>
                {parts.length === 0 && (
                  <SelectItem value="_none" disabled>
                    ไม่มีอุปกรณ์ที่พร้อมให้ยืม
                  </SelectItem>
                )}
                {parts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    [{p.site.code}] {p.modelCode} — {p.brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.sparePartId && (
              <p className="text-xs text-destructive">{errors.sparePartId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>ชื่อผู้ยืม *</Label>
              <Input {...register('borrowerName')} placeholder="ชื่อ-นามสกุล" />
              {errors.borrowerName && (
                <p className="text-xs text-destructive">{errors.borrowerName.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Email ผู้ยืม *</Label>
              <Input type="email" {...register('borrowerEmail')} placeholder="email@example.com" />
              {errors.borrowerEmail && (
                <p className="text-xs text-destructive">{errors.borrowerEmail.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Project / งาน</Label>
            <Input {...register('project')} placeholder="เช่น Capella Hotel Migration" />
            {errors.project && <p className="text-xs text-destructive">{errors.project.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>วันที่เริ่มยืม *</Label>
              <Input type="datetime-local" {...register('dateStart')} />
              {errors.dateStart && (
                <p className="text-xs text-destructive">{errors.dateStart.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>วันที่คาดว่าจะคืน</Label>
              <Input
                type="datetime-local"
                min={dateStartValue || undefined}
                {...register('expectedReturn')}
              />
              {errors.expectedReturn && (
                <p className="text-xs text-destructive">{errors.expectedReturn.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label>หมายเหตุ</Label>
            <Textarea {...register('borrowerRemark')} rows={2} placeholder="(ไม่บังคับ)" />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createBorrow.isPending}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={createBorrow.isPending || !watch('sparePartId')}>
              {createBorrow.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ส่งคำขอ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Remark Dialog (Approve / Reject / Return) ─────────────────────────────

interface RemarkDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  confirmLabel: string;
  confirmVariant?: 'default' | 'destructive';
  remarkLabel?: string;
  extraField?: React.ReactNode;
  onConfirm: (remark: string) => void;
  isPending: boolean;
}

function RemarkDialog({
  open,
  onOpenChange,
  title,
  confirmLabel,
  confirmVariant = 'default',
  remarkLabel = 'หมายเหตุ',
  extraField,
  onConfirm,
  isPending,
}: RemarkDialogProps) {
  const [remark, setRemark] = useState('');
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setRemark('');
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {extraField}
          <div className="space-y-1">
            <Label>{remarkLabel}</Label>
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
              placeholder="(ไม่บังคับ)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            ยกเลิก
          </Button>
          <Button variant={confirmVariant} onClick={() => onConfirm(remark)} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Return Dialog ──────────────────────────────────────────────────────────

function ReturnDialog({
  open,
  onOpenChange,
  tx,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tx: BorrowTransaction | null;
}) {
  const [returnDate, setReturnDate] = useState(() => toDatetimeLocal(new Date().toISOString()));
  const [remark, setRemark] = useState('');
  const returnBorrow = useReturnBorrow();
  const minReturnDate = tx?.dateStart ? toDatetimeLocal(tx.dateStart) : '';
  const isReturnBeforeBorrow = Boolean(minReturnDate && returnDate && returnDate < minReturnDate);

  if (!tx) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>บันทึกการคืน</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <strong>{tx.sparePart.modelCode}</strong> — {tx.borrowerName ?? tx.borrower.name}
          </p>
          <div className="space-y-1">
            <Label>วันที่คืน *</Label>
            <Input
              type="datetime-local"
              min={minReturnDate || undefined}
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
            />
            {isReturnBeforeBorrow && (
              <p className="text-xs text-destructive">วันที่คืนต้องไม่ก่อนวันที่ยืม</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>หมายเหตุ</Label>
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={2}
              placeholder="(ไม่บังคับ)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={returnBorrow.isPending}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={() =>
              isReturnBeforeBorrow
                ? toast.error('วันที่คืนต้องไม่ก่อนวันที่ยืม')
                : returnBorrow.mutate(
                    { id: tx.id, actualReturn: new Date(returnDate).toISOString(), remark },
                    { onSuccess: () => onOpenChange(false) }
                  )
            }
            disabled={returnBorrow.isPending || !returnDate || isReturnBeforeBorrow}
          >
            {returnBorrow.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            ยืนยันคืน
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Borrow Dialog ─────────────────────────────────────────────────────

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditBorrowDialog({
  open,
  onOpenChange,
  tx,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tx: BorrowTransaction | null;
}) {
  const updateBorrow = useUpdateBorrow();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EditBorrowInput>({
    resolver: zodResolver(editBorrowSchema),
  });
  const editDateStartValue = watch('dateStart');

  useEffect(() => {
    if (tx) {
      reset({
        borrowerName: tx.borrowerName ?? tx.borrower.name,
        borrowerEmail: tx.borrowerEmail ?? tx.borrower.email,
        project: tx.project ?? '',
        dateStart: toDatetimeLocal(tx.dateStart),
        expectedReturn: toDatetimeLocal(tx.expectedReturn),
        borrowerRemark: tx.borrowerRemark ?? '',
      });
    }
  }, [tx, reset]);

  if (!tx) return null;

  function onSubmit(data: EditBorrowInput) {
    updateBorrow.mutate({ id: tx!.id, data }, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>แก้ไขคำขอยืม</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            <span className="font-mono font-medium">{tx.sparePart.modelCode}</span>
            <span className="ml-2 text-muted-foreground">[{tx.sparePart.site.code}]</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>ชื่อผู้ยืม *</Label>
              <Input {...register('borrowerName')} placeholder="ชื่อ-นามสกุล" />
              {errors.borrowerName && (
                <p className="text-xs text-destructive">{errors.borrowerName.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Email ผู้ยืม *</Label>
              <Input type="email" {...register('borrowerEmail')} placeholder="email@example.com" />
              {errors.borrowerEmail && (
                <p className="text-xs text-destructive">{errors.borrowerEmail.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Project / งาน</Label>
            <Input {...register('project')} placeholder="เช่น Capella Hotel Migration" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>วันที่เริ่มยืม</Label>
              <Input type="datetime-local" {...register('dateStart')} />
            </div>
            <div className="space-y-1">
              <Label>วันที่คาดว่าจะคืน</Label>
              <Input
                type="datetime-local"
                min={editDateStartValue || undefined}
                {...register('expectedReturn')}
              />
              {errors.expectedReturn && (
                <p className="text-xs text-destructive">{errors.expectedReturn.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label>หมายเหตุ</Label>
            <Textarea {...register('borrowerRemark')} rows={2} placeholder="(ไม่บังคับ)" />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateBorrow.isPending}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={updateBorrow.isPending}>
              {updateBorrow.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              บันทึก
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Borrow Import Dialog ───────────────────────────────────────────────────

function BorrowImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BorrowImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleClose() {
    setFile(null);
    setResult(null);
    onOpenChange(false);
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    try {
      const res = await excelApi.borrowImport(file);
      setResult(res.data);
      onSuccess();
      toast.success(`นำเข้าสำเร็จ: ${res.data.imported} รายการ`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'เกิดข้อผิดพลาด';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" /> นำเข้าข้อมูลการยืม
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg border bg-green-50 p-3">
                <p className="text-2xl font-bold text-green-600">{result.imported}</p>
                <p className="text-xs text-muted-foreground">รายการใหม่</p>
              </div>
              <div className="rounded-lg border bg-gray-50 p-3">
                <p className="text-2xl font-bold text-gray-500">{result.errors.length}</p>
                <p className="text-xs text-muted-foreground">ข้อผิดพลาด</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-40 overflow-auto rounded border bg-red-50 p-2">
                <p className="mb-1 text-xs font-medium text-red-700">
                  ข้อผิดพลาด ({result.errors.length}):
                </p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600">
                    {e}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>ไฟล์ Excel (.xlsx) *</Label>
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 transition-colors hover:border-primary/50 hover:bg-muted/20"
                onClick={() => fileRef.current?.click()}
              >
                <FileSpreadsheet className="mb-2 h-8 w-8 text-muted-foreground" />
                {file ? (
                  <p className="text-sm font-medium">{file.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">คลิกเพื่อเลือกไฟล์</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">รองรับ .xlsx ขนาดไม่เกิน 10MB</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <button
              type="button"
              className="text-xs text-primary underline underline-offset-2"
              onClick={() => excelApi.downloadBorrowTemplate()}
            >
              ดาวน์โหลด Template
            </button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {result ? 'ปิด' : 'ยกเลิก'}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={!file || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              นำเข้า
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── BorrowPage ─────────────────────────────────────────────────────────────

const LIMIT = 20;

export function BorrowPage() {
  const { user } = useAuthStore();
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const qc = useQueryClient();
  const [now, setNow] = useState(() => Date.now());

  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [borrowAgainSparePartId, setBorrowAgainSparePartId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      await excelApi.borrowExport(statusFilter);
    } catch {
      toast.error('Export ไม่สำเร็จ');
    } finally {
      setExporting(false);
    }
  }

  // action dialogs
  const [approveTarget, setApproveTarget] = useState<BorrowTransaction | null>(null);
  const [rejectTarget, setRejectTarget] = useState<BorrowTransaction | null>(null);
  const [returnTarget, setReturnTarget] = useState<BorrowTransaction | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BorrowTransaction | null>(null);
  const [editTarget, setEditTarget] = useState<BorrowTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BorrowTransaction | null>(null);
  const [detailTarget, setDetailTarget] = useState<BorrowTransaction | null>(null);

  const { data, isLoading } = useBorrows({ status: statusFilter, page, limit: LIMIT });
  const approve = useApproveBorrow();
  const reject = useRejectBorrow();
  const cancel = useCancelBorrow();
  const deleteBorrow = useDeleteBorrow();

  const txs = data?.data ?? [];
  const meta = data?.meta;
  const detailOverdueDays = detailTarget ? getOverdueDays(detailTarget.expectedReturn, now) : 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <h1 className="text-xl font-bold">ยืม / คืน</h1>
        <div className="flex items-center gap-2">
          {isManager && (
            <>
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="mr-1 h-4 w-4" /> Import
              </Button>
              <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
                {exporting ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-1 h-4 w-4" />
                )}
                Export
              </Button>
            </>
          )}
          {user?.role !== 'VIEWER' && (
            <Button
              size="sm"
              onClick={() => {
                setBorrowAgainSparePartId(null);
                setCreateOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" /> ขอยืม
            </Button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 border-b bg-gray-50 px-6 py-3">
        <Select
          onValueChange={(v) => {
            setStatusFilter(v === 'ALL' ? undefined : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="ทุกสถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">ทุกสถานะ</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-white">
            <TableRow>
              <TableHead>อุปกรณ์</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>ชื่อผู้ยืม</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>วันที่ยืม</TableHead>
              <TableHead>วันที่คืน</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>ผู้อนุมัติ</TableHead>
              <TableHead className="w-36 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="py-16 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : txs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-16 text-center text-muted-foreground">
                  ไม่พบรายการ
                </TableCell>
              </TableRow>
            ) : (
              txs.map((tx) => {
                const canApproveReject = isManager && tx.status === 'PENDING';
                const canReturn =
                  tx.status === 'APPROVED' && (isManager || tx.borrower.id === user?.id);
                const canCancel =
                  tx.status === 'PENDING' && (isManager || tx.borrower.id === user?.id);
                const canEdit = tx.status === 'PENDING' && tx.borrower.id === user?.id;
                const canDelete = tx.status === 'PENDING' && isManager;
                const canBorrowAgain = user?.role !== 'VIEWER' && tx.status === 'REJECTED';
                const overdueDays = getOverdueDays(tx.expectedReturn, now);
                const isOverdue = tx.status === 'APPROVED' && overdueDays > 0;

                const displayName = tx.borrowerName ?? tx.borrower.name;
                const displayEmail = tx.borrowerEmail || null;

                return (
                  <TableRow
                    key={tx.id}
                    className="group cursor-pointer"
                    title="คลิกเพื่อดูรายละเอียด"
                    onClick={() => setDetailTarget(tx)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setDetailTarget(tx);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                  >
                    <TableCell>
                      <p className="font-mono text-xs font-medium">{tx.sparePart.modelCode}</p>
                      <p className="max-w-[150px] truncate text-xs text-muted-foreground">
                        {tx.sparePart.productName}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {tx.sparePart.site.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{displayName}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                      {displayEmail || '—'}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate text-sm">
                      {tx.project ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs">{fmtDate(tx.dateStart)}</TableCell>
                    <TableCell className="text-xs">{fmtDate(tx.expectedReturn)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={tx.status} />
                        {isOverdue && (
                          <Badge
                            variant="destructive"
                            className="whitespace-nowrap px-2 py-0.5 text-[11px] leading-none"
                          >
                            ล่าช้า {overdueDays} วัน
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {tx.approver ? (
                        <div>
                          <p className="font-medium">{tx.approver.name}</p>
                          {tx.approverRemark && (
                            <p className="max-w-[140px] truncate text-xs text-muted-foreground">
                              {tx.approverRemark}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="ml-auto grid w-fit grid-cols-3 gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-slate-600 hover:text-slate-900"
                          title="ดูรายละเอียด"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailTarget(tx);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canBorrowAgain && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-blue-600 hover:text-blue-700"
                            title="ขอยืมอีกครั้ง"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBorrowAgainSparePartId(tx.sparePart.id);
                              setCreateOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                        {canApproveReject && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-green-600 hover:text-green-700"
                              title="อนุมัติ"
                              onClick={(e) => {
                                e.stopPropagation();
                                setApproveTarget(tx);
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              title="ปฏิเสธ"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRejectTarget(tx);
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {canReturn && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-blue-600 hover:text-blue-700"
                            title="คืนของ"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReturnTarget(tx);
                            }}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        {canCancel && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="ยกเลิก"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancelTarget(tx);
                            }}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-blue-500 hover:text-blue-700"
                            title="แก้ไข"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditTarget(tx);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="ลบ"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(tx);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t bg-white px-6 py-3 text-sm text-muted-foreground">
          <span>
            แสดง {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)}{' '}
            จาก {meta.total} รายการ
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

      {/* Create dialog */}
      <CreateBorrowDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Import dialog */}
      <BorrowImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={() => qc.invalidateQueries({ queryKey: BORROW_KEY })}
      />

      {/* Detail dialog */}
      <Dialog open={!!detailTarget} onOpenChange={(v) => !v && setDetailTarget(null)}>
        <DialogContent className="max-h-[85vh] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" /> รายละเอียดการยืม
            </DialogTitle>
            {detailTarget && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="px-2 py-0.5 font-mono text-[11px]">
                  {detailTarget.sparePart.modelCode}
                </Badge>
                <Badge variant="secondary" className="px-2 py-0.5 text-[11px]">
                  {detailTarget.sparePart.site.code}
                </Badge>
                {detailTarget.status === 'APPROVED' && detailOverdueDays > 0 && (
                  <Badge
                    variant="destructive"
                    className="whitespace-nowrap px-2 py-0.5 text-[11px] leading-none"
                  >
                    ล่าช้า {detailOverdueDays} วัน
                  </Badge>
                )}
              </div>
            )}
          </DialogHeader>

          {detailTarget && (
            <div className="max-h-[70vh] space-y-4 overflow-auto pr-1">
              <div className="overflow-hidden rounded-xl border bg-muted/20">
                <div className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  รูปภาพอุปกรณ์
                </div>
                {detailTarget.sparePart.imageUrl ? (
                  <img
                    src={detailTarget.sparePart.imageUrl}
                    alt={detailTarget.sparePart.productName}
                    className="h-56 w-full bg-background object-contain p-3"
                  />
                ) : (
                  <div className="flex h-56 items-center justify-center px-3 text-sm text-muted-foreground">
                    ไม่มีรูปภาพสำหรับอุปกรณ์นี้
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <DetailField
                  label="อุปกรณ์"
                  value={
                    <>
                      <p className="font-medium text-foreground">
                        {detailTarget.sparePart.modelCode}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {detailTarget.sparePart.productName}
                      </p>
                    </>
                  }
                />
                <DetailField
                  label="Serial Number"
                  value={detailTarget.sparePart.serialNumber ?? '—'}
                />
                <DetailField
                  label="Material Code"
                  value={detailTarget.sparePart.materialCode ?? '—'}
                />
                <DetailField
                  label="สถานะ"
                  value={
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={detailTarget.status} />
                      {detailTarget.status === 'APPROVED' && detailOverdueDays > 0 && (
                        <Badge
                          variant="destructive"
                          className="whitespace-nowrap px-2 py-0.5 text-[11px] leading-none"
                        >
                          ล่าช้า {detailOverdueDays} วัน
                        </Badge>
                      )}
                    </div>
                  }
                />
                <CreateBorrowDialog
                  open={createOpen}
                  onOpenChange={(v) => {
                    setCreateOpen(v);
                    if (!v) setBorrowAgainSparePartId(null);
                  }}
                  initialSparePartId={borrowAgainSparePartId}
                />
                <DetailField
                  label="ผู้ยืม"
                  value={detailTarget.borrowerName ?? detailTarget.borrower.name}
                />
                <DetailField
                  label="Email"
                  value={detailTarget.borrowerEmail || detailTarget.borrower.email || '—'}
                />
                <DetailField label="Project" value={detailTarget.project ?? '—'} />
                <DetailField label="วันที่เริ่มยืม" value={fmtDateTime(detailTarget.dateStart)} />
                <DetailField
                  label="วันที่คาดว่าจะคืน"
                  value={fmtDateTime(detailTarget.expectedReturn)}
                />
                <DetailField label="วันที่คืนจริง" value={fmtDateTime(detailTarget.actualReturn)} />
                <DetailField label="ผู้อนุมัติ" value={detailTarget.approver?.name ?? '—'} />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <DetailField
                  label="หมายเหตุผู้ยืม"
                  value={
                    <p className="whitespace-pre-wrap break-words text-sm leading-snug text-foreground">
                      {detailTarget.borrowerRemark ?? '—'}
                    </p>
                  }
                />
                <DetailField
                  label="หมายเหตุผู้อนุมัติ"
                  value={
                    <p className="whitespace-pre-wrap break-words text-sm leading-snug text-foreground">
                      {detailTarget.approverRemark ?? '—'}
                    </p>
                  }
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve dialog */}
      <RemarkDialog
        open={!!approveTarget}
        onOpenChange={(v) => !v && setApproveTarget(null)}
        title="อนุมัติคำขอยืม"
        confirmLabel="อนุมัติ"
        remarkLabel="หมายเหตุผู้อนุมัติ"
        onConfirm={(remark) =>
          approveTarget &&
          approve.mutate(
            { id: approveTarget.id, remark },
            { onSuccess: () => setApproveTarget(null) }
          )
        }
        isPending={approve.isPending}
      />

      {/* Reject dialog */}
      <RemarkDialog
        open={!!rejectTarget}
        onOpenChange={(v) => !v && setRejectTarget(null)}
        title="ปฏิเสธคำขอยืม"
        confirmLabel="ปฏิเสธ"
        confirmVariant="destructive"
        remarkLabel="เหตุผลที่ปฏิเสธ"
        onConfirm={(remark) =>
          rejectTarget &&
          reject.mutate({ id: rejectTarget.id, remark }, { onSuccess: () => setRejectTarget(null) })
        }
        isPending={reject.isPending}
      />

      {/* Return dialog */}
      <ReturnDialog
        open={!!returnTarget}
        onOpenChange={(v) => !v && setReturnTarget(null)}
        tx={returnTarget}
      />

      {/* Edit dialog */}
      <EditBorrowDialog
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
        tx={editTarget}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันลบคำขอ</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบคำขอยืม <strong>{deleteTarget?.sparePart.modelCode}</strong> ใช่ไหม?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBorrow.isPending}>ไม่</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteBorrow.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteTarget &&
                deleteBorrow.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
              }
            >
              {deleteBorrow.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel confirm */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(v) => !v && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันยกเลิกคำขอ</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการยกเลิกคำขอยืม <strong>{cancelTarget?.sparePart.modelCode}</strong> ใช่ไหม?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancel.isPending}>ไม่</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancel.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                cancelTarget &&
                cancel.mutate(cancelTarget.id, { onSuccess: () => setCancelTarget(null) })
              }
            >
              {cancel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ยืนยัน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
