import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { borrowApi, type BorrowFilters } from './api';
import type { BorrowRequestInput, EditBorrowInput } from '@spare-part/shared';
import { useActionRefresh } from '@/components/action-refresh';

export const BORROW_KEY = ['borrow'] as const;

export function useBorrows(filters: BorrowFilters = {}) {
  return useQuery({
    queryKey: [...BORROW_KEY, filters],
    queryFn: () => borrowApi.list(filters).then((r) => r.data),
  });
}

export function useCreateBorrow() {
  const qc = useQueryClient();
  const { flashRefresh } = useActionRefresh();
  return useMutation({
    mutationFn: (data: BorrowRequestInput) => borrowApi.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BORROW_KEY });
      flashRefresh();
      toast.success('ส่งคำขอยืมสำเร็จ — รอการอนุมัติ');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}

export function useApproveBorrow() {
  const qc = useQueryClient();
  const { flashRefresh } = useActionRefresh();
  return useMutation({
    mutationFn: ({ id, remark }: { id: string; remark?: string }) =>
      borrowApi.approve(id, { approverRemark: remark }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BORROW_KEY });
      flashRefresh();
      toast.success('อนุมัติสำเร็จ');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}

export function useRejectBorrow() {
  const qc = useQueryClient();
  const { flashRefresh } = useActionRefresh();
  return useMutation({
    mutationFn: ({ id, remark }: { id: string; remark?: string }) =>
      borrowApi.reject(id, { approverRemark: remark }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BORROW_KEY });
      flashRefresh();
      toast.success('ปฏิเสธคำขอแล้ว');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}

export function useRestoreBorrow() {
  const qc = useQueryClient();
  const { flashRefresh } = useActionRefresh();
  return useMutation({
    mutationFn: (id: string) => borrowApi.restore(id).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BORROW_KEY });
      flashRefresh();
      toast.success('คืนสถานะกลับเป็นรออนุมัติแล้ว');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}

export function useReturnBorrow() {
  const qc = useQueryClient();
  const { flashRefresh } = useActionRefresh();
  return useMutation({
    mutationFn: ({
      id,
      actualReturn,
      remark,
    }: {
      id: string;
      actualReturn: string;
      remark?: string;
    }) => borrowApi.return(id, { actualReturn, borrowerRemark: remark }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BORROW_KEY });
      qc.invalidateQueries({ queryKey: ['spare-parts'] });
      flashRefresh();
      toast.success('คืนของสำเร็จ');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}

export function useCancelBorrow() {
  const qc = useQueryClient();
  const { flashRefresh } = useActionRefresh();
  return useMutation({
    mutationFn: (id: string) => borrowApi.cancel(id).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BORROW_KEY });
      flashRefresh();
      toast.success('ยกเลิกคำขอแล้ว');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}

export function useUpdateBorrow() {
  const qc = useQueryClient();
  const { flashRefresh } = useActionRefresh();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditBorrowInput }) =>
      borrowApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BORROW_KEY });
      flashRefresh();
      toast.success('แก้ไขคำขอสำเร็จ');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}

export function useDeleteBorrow() {
  const qc = useQueryClient();
  const { flashRefresh } = useActionRefresh();
  return useMutation({
    mutationFn: (id: string) => borrowApi.remove(id).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BORROW_KEY });
      flashRefresh();
      toast.success('ลบคำขอแล้ว');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}
