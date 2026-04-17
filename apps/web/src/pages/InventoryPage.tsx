import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Pencil, Trash2, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { createSparePartSchema, updateSparePartSchema } from '@spare-part/shared';
import type { CreateSparePartInput, UpdateSparePartInput, SparePart } from '@spare-part/shared';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
  useSpareParts,
  useCreateSparePart,
  useUpdateSparePart,
  useDeleteSparePart,
} from '@/features/inventory/useInventory';
import { useSites } from '@/features/master-data/useMasterData';
import { useEquipmentTypes } from '@/features/master-data/useMasterData';
import { useBrands } from '@/features/master-data/useMasterData';
import type { SparePartFilters } from '@/features/inventory/api';

// ── Status config ──────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'IN_SERVICE', label: 'In Service', color: 'default' },
  { value: 'IN_STOCK', label: 'In Stock', color: 'secondary' },
  { value: 'BORROWED', label: 'Borrowed', color: 'outline' },
  { value: 'MAINTENANCE', label: 'Maintenance', color: 'destructive' },
  { value: 'LOST', label: 'Lost', color: 'destructive' },
  { value: 'DECOMMISSIONED', label: 'Decommissioned', color: 'secondary' },
] as const;

type StatusValue = (typeof STATUS_OPTIONS)[number]['value'];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_OPTIONS.find((s) => s.value === status);
  const variantMap: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    IN_SERVICE: 'default',
    IN_STOCK: 'secondary',
    BORROWED: 'outline',
    MAINTENANCE: 'destructive',
    LOST: 'destructive',
    DECOMMISSIONED: 'secondary',
  };
  return <Badge variant={variantMap[status] ?? 'secondary'}>{cfg?.label ?? status}</Badge>;
}

// ── Spare Part Form (Create / Edit) ───────────────────────────────────────

interface SparePartFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: SparePart | null;
  onSuccess: () => void;
}

function SparePartForm({ open, onOpenChange, editing, onSuccess }: SparePartFormProps) {
  const { data: sites = [] } = useSites();
  const { data: types = [] } = useEquipmentTypes();
  const { data: brands = [] } = useBrands();
  const createPart = useCreateSparePart();
  const updatePart = useUpdateSparePart();

  const schema = editing ? updateSparePartSchema : createSparePartSchema;
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateSparePartInput | UpdateSparePartInput>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? {
          siteId: editing.site.id,
          equipmentTypeId: editing.equipmentType.id,
          brandId: editing.brand.id,
          materialCode: editing.materialCode ?? '',
          modelCode: editing.modelCode,
          productName: editing.productName,
          serialNumber: editing.serialNumber ?? '',
          macAddress: editing.macAddress ?? '',
          quantity: editing.quantity,
          minStock: editing.minStock,
          cost: editing.cost ? Number(editing.cost) : undefined,
          status: editing.status as StatusValue,
          location: editing.location ?? '',
          remark: editing.remark ?? '',
        }
      : { quantity: 1, minStock: 1, status: 'IN_STOCK' },
  });

  const isPending = createPart.isPending || updatePart.isPending;

  function onSubmit(data: CreateSparePartInput | UpdateSparePartInput) {
    const clean = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    ) as CreateSparePartInput | UpdateSparePartInput;

    if (editing) {
      updatePart.mutate({ id: editing.id, data: clean as UpdateSparePartInput }, { onSuccess });
    } else {
      createPart.mutate(clean as CreateSparePartInput, { onSuccess });
    }
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{editing ? 'แก้ไข Spare Part' : 'เพิ่ม Spare Part ใหม่'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4 pb-8">
          {/* Site / Type / Brand */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Site *</Label>
              <Select
                value={watch('siteId') as string | undefined}
                onValueChange={(v) => setValue('siteId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือก Site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.siteId && <p className="text-xs text-destructive">{errors.siteId.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>ประเภท *</Label>
              <Select
                value={watch('equipmentTypeId') as string | undefined}
                onValueChange={(v) => setValue('equipmentTypeId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภท" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.icon} {t.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.equipmentTypeId && (
                <p className="text-xs text-destructive">{errors.equipmentTypeId.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Brand *</Label>
              <Select
                value={watch('brandId') as string | undefined}
                onValueChange={(v) => setValue('brandId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือก Brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.brandId && (
                <p className="text-xs text-destructive">{errors.brandId.message}</p>
              )}
            </div>
          </div>

          {/* Model / Product */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Model Code *</Label>
              <Input {...register('modelCode')} placeholder="เช่น 901-R610-WW00" />
              {errors.modelCode && (
                <p className="text-xs text-destructive">{errors.modelCode.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Material Code</Label>
              <Input {...register('materialCode')} placeholder="เช่น ONWS0052000001" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Product Name *</Label>
            <Input {...register('productName')} placeholder="ชื่อสินค้าเต็ม" />
            {errors.productName && (
              <p className="text-xs text-destructive">{errors.productName.message}</p>
            )}
          </div>

          {/* Serial / MAC */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Serial Number</Label>
              <Input {...register('serialNumber')} placeholder="S/N" />
              {errors.serialNumber && (
                <p className="text-xs text-destructive">{errors.serialNumber.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>MAC Address</Label>
              <Input {...register('macAddress')} placeholder="AA:BB:CC:DD:EE:FF" />
              {errors.macAddress && (
                <p className="text-xs text-destructive">{errors.macAddress.message}</p>
              )}
            </div>
          </div>

          {/* Qty / MinStock / Cost / Status */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label>Quantity *</Label>
              <Input type="number" {...register('quantity', { valueAsNumber: true })} min={0} />
              {errors.quantity && (
                <p className="text-xs text-destructive">{errors.quantity.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Min Stock</Label>
              <Input type="number" {...register('minStock', { valueAsNumber: true })} min={0} />
            </div>
            <div className="space-y-1">
              <Label>ราคา (บาท)</Label>
              <Input
                type="number"
                {...register('cost', { valueAsNumber: true })}
                min={0}
                step="0.01"
              />
            </div>
            <div className="space-y-1">
              <Label>Status *</Label>
              <Select
                value={watch('status') as string | undefined}
                onValueChange={(v) => setValue('status', v as StatusValue)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.status && <p className="text-xs text-destructive">{errors.status.message}</p>}
            </div>
          </div>

          {/* Location / Remark */}
          <div className="space-y-1">
            <Label>Location</Label>
            <Input {...register('location')} placeholder="เช่น ห้อง PJ, BKK" />
          </div>
          <div className="space-y-1">
            <Label>หมายเหตุ</Label>
            <Textarea {...register('remark')} rows={3} placeholder="(ไม่บังคับ)" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              บันทึก
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ── InventoryPage ─────────────────────────────────────────────────────────

const LIMIT = 20;

export function InventoryPage() {
  const [filters, setFilters] = useState<SparePartFilters>({ page: 1, limit: LIMIT });
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<SparePart | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SparePart | null>(null);

  const { data: sites = [] } = useSites();
  const { data: types = [] } = useEquipmentTypes();
  const { data: brands = [] } = useBrands();
  const { data, isLoading } = useSpareParts(filters);
  const deletePart = useDeleteSparePart();

  const parts = data?.data ?? [];
  const meta = data?.meta;

  const setFilter = useCallback((key: keyof SparePartFilters, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFilter('search', search);
  }

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(part: SparePart) {
    setEditing(part);
    setSheetOpen(true);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <h1 className="text-xl font-bold">Spare Parts</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> เพิ่มรายการ
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-gray-50 px-6 py-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-8 w-52 pl-8 text-sm"
              placeholder="ค้นหา model / serial..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" className="h-8">
            ค้นหา
          </Button>
        </form>

        <Select onValueChange={(v) => setFilter('siteId', v === 'ALL' ? undefined : v)}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="ทุก Site" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">ทุก Site</SelectItem>
            {sites.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={(v) => setFilter('equipmentTypeId', v === 'ALL' ? undefined : v)}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="ทุกประเภท" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">ทุกประเภท</SelectItem>
            {types.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.icon} {t.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={(v) => setFilter('brandId', v === 'ALL' ? undefined : v)}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="ทุก Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">ทุก Brand</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={(v) => setFilter('status', v === 'ALL' ? undefined : v)}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="ทุก Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">ทุก Status</SelectItem>
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
              <TableHead>Model Code</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>ประเภท</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead className="text-center">Qty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-16 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : parts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-16 text-center text-muted-foreground">
                  ไม่พบข้อมูล
                </TableCell>
              </TableRow>
            ) : (
              parts.map((p) => (
                <TableRow key={p.id} className="group">
                  <TableCell className="font-mono text-xs font-medium">{p.modelCode}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm" title={p.productName}>
                    {p.productName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {p.site.code}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.equipmentType.icon} {p.equipmentType.code}
                  </TableCell>
                  <TableCell className="text-xs">{p.brand.name}</TableCell>
                  <TableCell className="text-center font-medium">{p.quantity}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.location ?? '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
              disabled={meta.page <= 1}
              onClick={() => setFilters((p) => ({ ...p, page: p.page! - 1 }))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center px-2 text-xs">
              {meta.page} / {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setFilters((p) => ({ ...p, page: p.page! + 1 }))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Sheet */}
      <SparePartForm
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
        onSuccess={() => setSheetOpen(false)}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบ <strong>{deleteTarget?.modelCode}</strong> ({deleteTarget?.productName})
              ใช่ไหม?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePart.isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletePart.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteTarget &&
                deletePart.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
              }
            >
              {deletePart.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
