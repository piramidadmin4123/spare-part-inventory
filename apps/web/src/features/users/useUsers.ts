import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usersApi } from './api';
import type { UserRole } from '@spare-part/shared';
import { useActionRefresh } from '@/components/action-refresh';

export const USERS_KEY = ['users'] as const;

export function useUsers() {
  return useQuery({ queryKey: USERS_KEY, queryFn: () => usersApi.list().then((r) => r.data) });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  const { flashRefresh } = useActionRefresh();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      usersApi.updateRole(id, role).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
      flashRefresh();
      toast.success('อัปเดต role สำเร็จ');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}
