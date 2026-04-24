import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Pencil, Trash2, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  createSiteSchema,
  updateSiteSchema,
  createEquipmentTypeSchema,
  updateEquipmentTypeSchema,
  createBrandSchema,
  updateBrandSchema,
} from '@spare-part/shared';
import type {
  CreateSiteInput,
  UpdateSiteInput,
  CreateEquipmentTypeInput,
  UpdateEquipmentTypeInput,
  CreateBrandInput,
  UpdateBrandInput,
  Site,
  EquipmentType,
  Brand,
} from '@spare-part/shared';
import {
  useSites,
  useCreateSite,
  useUpdateSite,
  useDeleteSite,
  useEquipmentTypes,
  useCreateEquipmentType,
  useUpdateEquipmentType,
  useDeleteEquipmentType,
  useBrands,
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand,
} from '@/features/master-data/useMasterData';
import { useAuthStore } from '@/store/auth.store';
import { isSuperAdminRole } from '@/lib/roles';
import { SettingsUsersTab } from './SettingsUsersTab';

// ── Generic delete confirm ─────────────────────────────────────────────────

function DeleteConfirm({
  open,
  onOpenChange,
  label,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  label: string;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
          <AlertDialogDescription>
            ต้องการลบ <strong>{label}</strong> ใช่ไหม? ไม่สามารถกู้คืนได้
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            ลบ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Sites Tab ──────────────────────────────────────────────────────────────

function SitesTab() {
  const { data: sites = [], isLoading } = useSites();
  const createSite = useCreateSite();
  const updateSite = useUpdateSite();
  const deleteSite = useDeleteSite();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Site | null>(null);

  const schema = editing ? updateSiteSchema : createSiteSchema;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSiteInput | UpdateSiteInput>({
    resolver: zodResolver(schema),
  });

  function openCreate() {
    setEditing(null);
    reset({ code: '', name: '', description: '', address: '' });
    setDialogOpen(true);
  }

  function openEdit(site: Site) {
    setEditing(site);
    reset({
      code: site.code,
      name: site.name,
      description: site.description ?? '',
      address: site.address ?? '',
    });
    setDialogOpen(true);
  }

  function onSubmit(data: CreateSiteInput | UpdateSiteInput) {
    if (editing) {
      const clean = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined && v !== '')
      ) as UpdateSiteInput;
      updateSite.mutate({ id: editing.id, data: clean }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createSite.mutate(data as CreateSiteInput, { onSuccess: () => setDialogOpen(false) });
    }
  }

  const isPendingMutation = createSite.isPending || updateSite.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sites.length} site(s)</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> เพิ่ม Site
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>ชื่อ</TableHead>
            <TableHead>คำอธิบาย</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              </TableCell>
            </TableRow>
          ) : sites.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                ยังไม่มีข้อมูล
              </TableCell>
            </TableRow>
          ) : (
            sites.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono font-medium">{s.code}</TableCell>
                <TableCell>{s.name}</TableCell>
                <TableCell className="text-muted-foreground">{s.description ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={s.isActive ? 'default' : 'secondary'}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(s)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent key={editing?.id ?? 'new'}>
          <DialogHeader>
            <DialogTitle>{editing ? 'แก้ไข Site' : 'เพิ่ม Site ใหม่'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label>Code *</Label>
              <Input {...register('code')} placeholder="เช่น BKK" className="uppercase" />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>ชื่อ *</Label>
              <Input {...register('name')} placeholder="เช่น Bangkok HQ" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>คำอธิบาย</Label>
              <Input {...register('description')} placeholder="(ไม่บังคับ)" />
            </div>
            <div className="space-y-1">
              <Label>ที่อยู่</Label>
              <Input {...register('address')} placeholder="(ไม่บังคับ)" />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isPendingMutation}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isPendingMutation}>
                {isPendingMutation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                บันทึก
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirm
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        label={deleteTarget?.name ?? ''}
        onConfirm={() =>
          deleteTarget &&
          deleteSite.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
        isPending={deleteSite.isPending}
      />
    </div>
  );
}

// ── Equipment Types Tab ────────────────────────────────────────────────────

function EquipmentTypesTab() {
  const { data: types = [], isLoading } = useEquipmentTypes();
  const createType = useCreateEquipmentType();
  const updateType = useUpdateEquipmentType();
  const deleteType = useDeleteEquipmentType();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EquipmentType | null>(null);

  const schema = editing ? updateEquipmentTypeSchema : createEquipmentTypeSchema;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateEquipmentTypeInput | UpdateEquipmentTypeInput>({
    resolver: zodResolver(schema),
  });

  function openCreate() {
    setEditing(null);
    reset({ code: '', name: '', category: '', icon: '' });
    setDialogOpen(true);
  }

  function openEdit(t: EquipmentType) {
    setEditing(t);
    reset({ code: t.code, name: t.name, category: t.category, icon: t.icon ?? '' });
    setDialogOpen(true);
  }

  function onSubmit(data: CreateEquipmentTypeInput | UpdateEquipmentTypeInput) {
    if (editing) {
      const clean = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined && v !== '')
      ) as UpdateEquipmentTypeInput;
      updateType.mutate({ id: editing.id, data: clean }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createType.mutate(data as CreateEquipmentTypeInput, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  }

  const isPendingMutation = createType.isPending || updateType.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{types.length} ประเภท</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> เพิ่มประเภท
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Icon</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>ชื่อ</TableHead>
            <TableHead>หมวด</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              </TableCell>
            </TableRow>
          ) : types.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                ยังไม่มีข้อมูล
              </TableCell>
            </TableRow>
          ) : (
            types.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-xl">{t.icon ?? '—'}</TableCell>
                <TableCell className="font-mono font-medium">{t.code}</TableCell>
                <TableCell>{t.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{t.category}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(t)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent key={editing?.id ?? 'new'}>
          <DialogHeader>
            <DialogTitle>{editing ? 'แก้ไขประเภทอุปกรณ์' : 'เพิ่มประเภทอุปกรณ์ใหม่'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Code *</Label>
                <Input {...register('code')} placeholder="เช่น AP-R" />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Icon (emoji)</Label>
                <Input {...register('icon')} placeholder="เช่น 📡" maxLength={4} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>ชื่อ *</Label>
              <Input {...register('name')} placeholder="เช่น Access Point Ruckus" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>หมวดหมู่ *</Label>
              <Input {...register('category')} placeholder="เช่น Access Point" />
              {errors.category && (
                <p className="text-xs text-destructive">{errors.category.message}</p>
              )}
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isPendingMutation}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isPendingMutation}>
                {isPendingMutation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                บันทึก
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirm
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        label={deleteTarget?.name ?? ''}
        onConfirm={() =>
          deleteTarget &&
          deleteType.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
        isPending={deleteType.isPending}
      />
    </div>
  );
}

// ── Brands Tab ─────────────────────────────────────────────────────────────

function BrandsTab() {
  const { data: brands = [], isLoading } = useBrands();
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const deleteBrand = useDeleteBrand();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);

  const schema = editing ? updateBrandSchema : createBrandSchema;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBrandInput | UpdateBrandInput>({
    resolver: zodResolver(schema),
  });

  function openCreate() {
    setEditing(null);
    reset({ name: '' });
    setDialogOpen(true);
  }

  function openEdit(b: Brand) {
    setEditing(b);
    reset({ name: b.name });
    setDialogOpen(true);
  }

  function onSubmit(data: CreateBrandInput | UpdateBrandInput) {
    if (editing) {
      const clean = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined && v !== '')
      ) as UpdateBrandInput;
      updateBrand.mutate(
        { id: editing.id, data: clean },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createBrand.mutate(data as CreateBrandInput, { onSuccess: () => setDialogOpen(false) });
    }
  }

  const isPendingMutation = createBrand.isPending || updateBrand.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{brands.length} brand(s)</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> เพิ่ม Brand
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ชื่อ Brand</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={2} className="py-8 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              </TableCell>
            </TableRow>
          ) : brands.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                ยังไม่มีข้อมูล
              </TableCell>
            </TableRow>
          ) : (
            brands.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(b)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent key={editing?.id ?? 'new'}>
          <DialogHeader>
            <DialogTitle>{editing ? 'แก้ไข Brand' : 'เพิ่ม Brand ใหม่'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label>ชื่อ Brand *</Label>
              <Input {...register('name')} placeholder="เช่น Ruckus" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isPendingMutation}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isPendingMutation}>
                {isPendingMutation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                บันทึก
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirm
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        label={deleteTarget?.name ?? ''}
        onConfirm={() =>
          deleteTarget &&
          deleteBrand.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
        isPending={deleteBrand.isPending}
      />
    </div>
  );
}

// ── SettingsPage ───────────────────────────────────────────────────────────

export function SettingsPage() {
  const { user } = useAuthStore();
  const showUsersTab = isSuperAdminRole(user?.role);

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Settings</h1>
      <Tabs defaultValue="sites">
        <TabsList className="mb-4">
          <TabsTrigger value="sites">Sites</TabsTrigger>
          <TabsTrigger value="equipment-types">ประเภทอุปกรณ์</TabsTrigger>
          <TabsTrigger value="brands">Brands</TabsTrigger>
          {showUsersTab && <TabsTrigger value="users">Accounts</TabsTrigger>}
        </TabsList>
        <TabsContent value="sites">
          <SitesTab />
        </TabsContent>
        <TabsContent value="equipment-types">
          <EquipmentTypesTab />
        </TabsContent>
        <TabsContent value="brands">
          <BrandsTab />
        </TabsContent>
        {showUsersTab && (
          <TabsContent value="users">
            <SettingsUsersTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
