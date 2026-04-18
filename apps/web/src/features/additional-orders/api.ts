import { apiClient } from '@/lib/api-client';

export interface AdditionalOrder {
  id: string;
  siteId: string | null;
  site: { id: string; code: string; name: string } | null;
  brandId: string | null;
  brand: { id: string; name: string } | null;
  type: string;
  modelCode: string | null;
  productName: string;
  quantity: number;
  unitCost: number | null;
  totalCost: number | null;
  status: 'PENDING' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  remark: string | null;
  createdAt: string;
}

export interface AdditionalOrdersResponse {
  orders: AdditionalOrder[];
  total: number;
  page: number;
  limit: number;
}

export interface AdditionalOrderFilters {
  siteId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const additionalOrdersApi = {
  list: (filters: AdditionalOrderFilters = {}) =>
    apiClient.get<AdditionalOrdersResponse>('/api/additional-orders', { params: filters }),

  updateStatus: (id: string, status: string, remark?: string) =>
    apiClient.patch<AdditionalOrder>(`/api/additional-orders/${id}`, { status, remark }),

  delete: (id: string) => apiClient.delete(`/api/additional-orders/${id}`),
};
