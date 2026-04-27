import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { additionalOrdersApi, type AdditionalOrderFilters, type OrderPayload } from './api';
import { useActionRefresh } from '@/components/action-refresh';

export const AO_KEY = ['additional-orders'] as const;

export function useAdditionalOrders(filters: AdditionalOrderFilters = {}) {
  return useQuery({
    queryKey: [...AO_KEY, filters],
    queryFn: () => additionalOrdersApi.list(filters).then((r) => r.data),
  });
}

export function useOrderImage(id: string | null) {
  return useQuery({
    queryKey: [...AO_KEY, 'image', id],
    queryFn: () => additionalOrdersApi.getImage(id!).then((r) => r.data.imageData),
    enabled: !!id,
    staleTime: Infinity,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  const { flashRefresh } = useActionRefresh();
  return useMutation({
    mutationFn: (data: OrderPayload) => additionalOrdersApi.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AO_KEY });
      flashRefresh();
      toast.success('เพิ่มรายการสำเร็จ');
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  const { flashRefresh } = useActionRefresh();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: OrderPayload }) =>
      additionalOrdersApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AO_KEY });
      flashRefresh();
      toast.success('บันทึกสำเร็จ');
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  const { flashRefresh } = useActionRefresh();
  return useMutation({
    mutationFn: (id: string) => additionalOrdersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AO_KEY });
      flashRefresh();
      toast.success('ลบรายการสำเร็จ');
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  });
}
