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
  hasImage: boolean;
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

export interface OrderPayload {
  siteId?: string | null;
  type?: string;
  brandName?: string;
  modelCode?: string;
  productName?: string;
  quantity?: number;
  unitCost?: number | null;
  totalCost?: number | null;
  status?: string;
  remark?: string;
}

export const additionalOrdersApi = {
  list: (filters: AdditionalOrderFilters = {}) =>
    apiClient.get<AdditionalOrdersResponse>('/api/additional-orders', { params: filters }),

  getImage: (id: string) =>
    apiClient.get<{ imageData: string }>(`/api/additional-orders/${id}/image`),

  create: (data: OrderPayload) => apiClient.post<AdditionalOrder>('/api/additional-orders', data),

  update: (id: string, data: OrderPayload) =>
    apiClient.patch<AdditionalOrder>(`/api/additional-orders/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/additional-orders/${id}`),
};
