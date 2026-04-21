import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  ShoppingCart,
  Clock,
  XCircle,
  PackageCheck,
  Plus,
  Pencil,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useAdditionalOrders,
  useOrderImage,
  useCreateOrder,
  useUpdateOrder,
  useDeleteOrder,
} from '@/features/additional-orders/useAdditionalOrders';
import { useSites, useBrands } from '@/features/master-data/useMasterData';
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

// ── Form schema ───────────────────────────────────────────────────────────────
const orderSchema = z.object({
  siteId: z.string().optional(),
  type: z.string().min(1, 'กรุณาระบุ Type'),
  brandName: z.string().optional(),
  modelCode: z.string().optional(),
  productName: z.string().min(1, 'กรุณาระบุชื่อสินค้า'),
  quantity: z.coerce.number().int().min(1, 'Qty ต้องมากกว่า 0'),
  unitCost: z.coerce.number().min(0).optional().or(z.literal('')),
  totalCost: z.coerce.number().min(0).optional().or(z.literal('')),
  status: z.string(),
  remark: z.string().optional(),
});
type OrderFormValues = z.infer<typeof orderSchema>;

// ── Sub-components ────────────────────────────────────────────────────────────
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

function ThumbnailCell({
  orderId,
  productName,
  onExpand,
}: {
  orderId: string;
  productName: string;
  onExpand: () => void;
}) {
  const { data: imageData, isLoading } = useOrderImage(orderId);
  if (isLoading) return <div className="h-10 w-14 animate-pulse rounded bg-gray-200" />;
  if (!imageData) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <button onClick={onExpand} className="focus:outline-none" title="คลิกดูรูปขนาดใหญ่">
      <img
        src={imageData}
        alt={productName}
        className="h-10 w-14 cursor-pointer rounded border object-contain transition-opacity hover:opacity-75"
      />
    </button>
  );
}

function ImagePreviewDialog({
  orderId,
  productName,
  open,
  onClose,
}: {
  orderId: string;
  productName: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: imageData, isLoading } = useOrderImage(open ? orderId : null);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="line-clamp-2 text-sm">{productName}</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-48 items-center justify-center">
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : imageData ? (
            <img
              src={imageData}
              alt={productName}
              className="max-h-[70vh] max-w-full rounded object-contain"
            />
          ) : (
            <p className="text-sm text-muted-foreground">ไม่พบรูปภาพ</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OrderFormDialog({
  open,
  onClose,
  editOrder,
}: {
  open: boolean;
  onClose: () => void;
  editOrder: AdditionalOrder | null;
}) {
  const { data: sites = [] } = useSites();
  const { data: brands = [] } = useBrands();
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const isEdit = !!editOrder;
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');

  function clearSelectedImage() {
    setImageData(null);
    setImageName('');
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new Error('Unable to read image'));
      };
      reader.onerror = () => reject(reader.error ?? new Error('Unable to read image'));
      reader.readAsDataURL(file);
    });

    setImageData(dataUrl);
    setImageName(file.name);
    e.target.value = '';
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      siteId: '',
      type: '',
      brandName: '',
      modelCode: '',
      productName: '',
      quantity: 1,
      unitCost: '',
      totalCost: '',
      status: 'PENDING',
      remark: '',
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (!open) {
      clearSelectedImage();
      return;
    }

    if (editOrder) {
      reset({
        siteId: editOrder.siteId ?? '',
        type: editOrder.type,
        brandName: editOrder.brand?.name ?? '',
        modelCode: editOrder.modelCode ?? '',
        productName: editOrder.productName,
        quantity: editOrder.quantity,
        unitCost: editOrder.unitCost != null ? editOrder.unitCost : '',
        totalCost: editOrder.totalCost != null ? editOrder.totalCost : '',
        status: editOrder.status,
        remark: editOrder.remark ?? '',
      });
    } else {
      reset({
        siteId: '',
        type: '',
        brandName: '',
        modelCode: '',
        productName: '',
        quantity: 1,
        unitCost: '',
        totalCost: '',
        status: 'PENDING',
        remark: '',
      });
    }

    clearSelectedImage();
  }, [editOrder, open, reset]);

  // Auto-calculate totalCost when qty/unitCost changes
  const qty = watch('quantity');
  const unitCostVal = watch('unitCost');
  useEffect(() => {
    if (qty && unitCostVal !== '' && unitCostVal != null) {
      const total = Number(qty) * Number(unitCostVal);
      if (!isNaN(total)) setValue('totalCost', total);
    }
  }, [qty, unitCostVal, setValue]);

  async function onSubmit(values: OrderFormValues) {
    const payload = {
      siteId: values.siteId || null,
      type: values.type,
      brandName: values.brandName || undefined,
      modelCode: values.modelCode || undefined,
      productName: values.productName,
      quantity: values.quantity,
      unitCost: values.unitCost !== '' ? Number(values.unitCost) : null,
      totalCost: values.totalCost !== '' ? Number(values.totalCost) : null,
      status: values.status,
      remark: values.remark || undefined,
      imageData: imageData ?? undefined,
    };

    if (isEdit) {
      await updateOrder.mutateAsync({ id: editOrder!.id, data: payload });
    } else {
      await createOrder.mutateAsync(payload);
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{isEdit ? 'แก้ไขรายการสั่งซื้อ' : 'เพิ่มรายการสั่งซื้อ'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-4 overflow-y-auto px-6 pb-4 pt-1">
              {/* Site */}
              <div className="space-y-1">
                <Label>Site</Label>
                <Select
                  value={watch('siteId') || 'none'}
                  onValueChange={(v) => setValue('siteId', v === 'none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือก Site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code} — {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <Label>สถานะ</Label>
                <Select value={watch('status')} onValueChange={(v) => setValue('status', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                      <SelectItem key={val} value={val}>
                        {cfg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type */}
              <div className="space-y-1">
                <Label>
                  Type <span className="text-destructive">*</span>
                </Label>
                <Input {...register('type')} placeholder="เช่น Fiber, Switch" />
                {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 w-full justify-start gap-2 border-dashed text-muted-foreground"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  เพิ่มรูป
                </Button>
                {imageName && (
                  <p className="text-xs text-muted-foreground">ไฟล์ที่เลือก: {imageName}</p>
                )}
                {!imageName && editOrder?.hasImage && (
                  <p className="text-xs text-muted-foreground">รายการนี้มีรูปภาพอยู่แล้ว</p>
                )}
                {imageData && (
                  <div className="space-y-2 pt-1">
                    <div className="max-h-32 overflow-auto rounded border bg-muted/20 p-2">
                      <img
                        src={imageData}
                        alt="ตัวอย่างรูปที่เลือก"
                        className="mx-auto max-h-24 w-auto rounded object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline underline-offset-2"
                      onClick={clearSelectedImage}
                    >
                      ลบรูปที่เลือก
                    </button>
                  </div>
                )}
              </div>

              {/* Brand */}
              <div className="space-y-1">
                <Label>Brand</Label>
                <Select
                  value={watch('brandName') || 'custom'}
                  onValueChange={(v) => setValue('brandName', v === 'custom' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกหรือพิมพ์ brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">— พิมพ์เอง —</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.name}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  {...register('brandName')}
                  placeholder="หรือพิมพ์ชื่อ Brand ใหม่"
                  className="mt-1"
                />
              </div>

              {/* Model Code */}
              <div className="space-y-1">
                <Label>Model Code</Label>
                <Input {...register('modelCode')} placeholder="เช่น UFP542D31-03" />
              </div>

              {/* Product Name */}
              <div className="space-y-1">
                <Label>
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input {...register('productName')} placeholder="ชื่อสินค้า" />
                {errors.productName && (
                  <p className="text-xs text-destructive">{errors.productName.message}</p>
                )}
              </div>

              {/* Qty */}
              <div className="space-y-1">
                <Label>
                  Qty <span className="text-destructive">*</span>
                </Label>
                <Input type="number" min={1} {...register('quantity')} />
                {errors.quantity && (
                  <p className="text-xs text-destructive">{errors.quantity.message}</p>
                )}
              </div>

              {/* Unit Cost */}
              <div className="space-y-1">
                <Label>Unit Cost (บาท)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  {...register('unitCost')}
                  placeholder="0.00"
                />
              </div>

              {/* Total Cost */}
              <div className="col-span-2 space-y-1">
                <Label>Total Cost (บาท) — คำนวณอัตโนมัติ Qty × Unit Cost</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  {...register('totalCost')}
                  placeholder="0.00"
                />
              </div>

              {/* Remark */}
              <div className="col-span-2 space-y-1">
                <Label>Remark</Label>
                <Textarea {...register('remark')} placeholder="หมายเหตุ..." rows={2} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={onClose}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'บันทึก' : 'เพิ่มรายการ'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdditionalOrdersPage() {
  const { user } = useAuthStore();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [search, setSearch] = useState('');
  const [siteId, setSiteId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdditionalOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdditionalOrder | null>(null);
  const [imagePreview, setImagePreview] = useState<{ id: string; productName: string } | null>(
    null
  );

  const filters = {
    ...(search && { search }),
    ...(siteId && { siteId }),
    ...(status && { status }),
    page,
    limit: LIMIT,
  };

  const { data, isLoading } = useAdditionalOrders(filters);
  const deleteOrder = useDeleteOrder();
  const { data: sites = [] } = useSites();

  const orders = data?.orders ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  function fmt(n: number | null) {
    if (n == null) return '—';
    return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(order: AdditionalOrder) {
    setEditTarget(order);
    setFormOpen(true);
  }

  const colSpan = canEdit ? 14 : 12;

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">รายการสั่งซื้อเพิ่ม</h1>
          <p className="text-sm text-muted-foreground">Additional Orders ({total} รายการ)</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            เพิ่มรายการ
          </Button>
        )}
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
              <TableHead className="w-16 text-center">รูป</TableHead>
              {canEdit && (
                <>
                  <TableHead className="w-10 text-center">แก้ไข</TableHead>
                  <TableHead className="w-10 text-center">ลบ</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">
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
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="max-w-[160px] text-xs text-muted-foreground">
                    <p className="line-clamp-2">{order.remark ?? '—'}</p>
                  </TableCell>
                  <TableCell className="text-center">
                    {order.hasImage ? (
                      <ThumbnailCell
                        orderId={order.id}
                        productName={order.productName}
                        onExpand={() =>
                          setImagePreview({ id: order.id, productName: order.productName })
                        }
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  {canEdit && (
                    <>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(order)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
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
                    </>
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

      {/* Create / Edit Dialog */}
      <OrderFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditTarget(null);
        }}
        editOrder={editTarget}
      />

      {/* Image Preview Dialog */}
      {imagePreview && (
        <ImagePreviewDialog
          orderId={imagePreview.id}
          productName={imagePreview.productName}
          open={!!imagePreview}
          onClose={() => setImagePreview(null)}
        />
      )}

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
