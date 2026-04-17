import { apiClient } from '@/lib/api-client';
import type { SparePart, PaginatedResponse } from '@spare-part/shared';
import type { CreateSparePartInput, UpdateSparePartInput } from '@spare-part/shared';

export interface SparePartFilters {
  siteId?: string;
  equipmentTypeId?: string;
  brandId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const inventoryApi = {
  list: (params: SparePartFilters = {}) =>
    apiClient.get<PaginatedResponse<SparePart>>('/api/spare-parts', { params }),
  get: (id: string) => apiClient.get<SparePart>(`/api/spare-parts/${id}`),
  create: (data: CreateSparePartInput) => apiClient.post<SparePart>('/api/spare-parts', data),
  update: (id: string, data: UpdateSparePartInput) =>
    apiClient.patch<SparePart>(`/api/spare-parts/${id}`, data),
  remove: (id: string) => apiClient.delete<{ message: string }>(`/api/spare-parts/${id}`),
};
