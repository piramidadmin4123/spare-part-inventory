import { apiClient } from '@/lib/api-client';
import type { Site, EquipmentType, Brand } from '@spare-part/shared';
import type {
  CreateSiteInput,
  UpdateSiteInput,
  CreateEquipmentTypeInput,
  UpdateEquipmentTypeInput,
  CreateBrandInput,
  UpdateBrandInput,
} from '@spare-part/shared';

export interface SiteStats {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  totalParts: number;
  totalOrders: number;
  partsByStatus: Record<string, number>;
  ordersByStatus: Record<string, number>;
}

export const sitesApi = {
  list: () => apiClient.get<Site[]>('/api/sites'),
  stats: () => apiClient.get<SiteStats[]>('/api/sites/stats'),
  create: (data: CreateSiteInput) => apiClient.post<Site>('/api/sites', data),
  update: (id: string, data: UpdateSiteInput) => apiClient.patch<Site>(`/api/sites/${id}`, data),
  remove: (id: string) => apiClient.delete<{ message: string }>(`/api/sites/${id}`),
};

export const equipmentTypesApi = {
  list: () => apiClient.get<EquipmentType[]>('/api/equipment-types'),
  create: (data: CreateEquipmentTypeInput) =>
    apiClient.post<EquipmentType>('/api/equipment-types', data),
  update: (id: string, data: UpdateEquipmentTypeInput) =>
    apiClient.patch<EquipmentType>(`/api/equipment-types/${id}`, data),
  remove: (id: string) => apiClient.delete<{ message: string }>(`/api/equipment-types/${id}`),
};

export const brandsApi = {
  list: () => apiClient.get<Brand[]>('/api/brands'),
  create: (data: CreateBrandInput) => apiClient.post<Brand>('/api/brands', data),
  update: (id: string, data: UpdateBrandInput) => apiClient.patch<Brand>(`/api/brands/${id}`, data),
  remove: (id: string) => apiClient.delete<{ message: string }>(`/api/brands/${id}`),
};
