import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { additionalOrdersApi, type AdditionalOrderFilters } from './api';

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

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, remark }: { id: string; status: string; remark?: string }) =>
      additionalOrdersApi.updateStatus(id, status, remark).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AO_KEY });
      toast.success('อัปเดตสถานะสำเร็จ');
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => additionalOrdersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AO_KEY });
      toast.success('ลบรายการสำเร็จ');
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  });
}
