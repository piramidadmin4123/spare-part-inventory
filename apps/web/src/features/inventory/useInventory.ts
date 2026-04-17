import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { inventoryApi, type SparePartFilters } from './api';
import type { CreateSparePartInput, UpdateSparePartInput } from '@spare-part/shared';

export const INVENTORY_KEY = ['spare-parts'] as const;

export function useSpareParts(filters: SparePartFilters = {}) {
  return useQuery({
    queryKey: [...INVENTORY_KEY, filters],
    queryFn: () => inventoryApi.list(filters).then((r) => r.data),
  });
}

export function useCreateSparePart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSparePartInput) => inventoryApi.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVENTORY_KEY });
      toast.success('เพิ่ม Spare Part สำเร็จ');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}

export function useUpdateSparePart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSparePartInput }) =>
      inventoryApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVENTORY_KEY });
      toast.success('อัปเดต Spare Part สำเร็จ');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}

export function useDeleteSparePart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryApi.remove(id).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVENTORY_KEY });
      toast.success('ลบ Spare Part สำเร็จ');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}
