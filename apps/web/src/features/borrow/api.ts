import { apiClient } from '@/lib/api-client';
import type { BorrowTransaction, PaginatedResponse } from '@spare-part/shared';
import type { BorrowRequestInput, EditBorrowInput } from '@spare-part/shared';

export interface BorrowFilters {
  status?: string;
  borrowerId?: string;
  sparePartId?: string;
  page?: number;
  limit?: number;
}

export const borrowApi = {
  list: (params: BorrowFilters = {}) =>
    apiClient.get<PaginatedResponse<BorrowTransaction>>('/api/borrow', { params }),
  get: (id: string) => apiClient.get<BorrowTransaction>(`/api/borrow/${id}`),
  create: (data: BorrowRequestInput) => apiClient.post<BorrowTransaction>('/api/borrow', data),
  approve: (id: string, data: { approverRemark?: string }) =>
    apiClient.patch<BorrowTransaction>(`/api/borrow/${id}/approve`, data),
  reject: (id: string, data: { approverRemark?: string }) =>
    apiClient.patch<BorrowTransaction>(`/api/borrow/${id}/reject`, data),
  return: (id: string, data: { actualReturn: string; borrowerRemark?: string }) =>
    apiClient.patch<BorrowTransaction>(`/api/borrow/${id}/return`, data),
  cancel: (id: string, data?: { borrowerRemark?: string }) =>
    apiClient.patch<BorrowTransaction>(`/api/borrow/${id}/cancel`, data ?? {}),
  update: (id: string, data: EditBorrowInput) =>
    apiClient.patch<BorrowTransaction>(`/api/borrow/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/api/borrow/${id}`),
};
