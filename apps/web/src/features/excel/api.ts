import { apiClient } from '@/lib/api-client';

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  ordersImported: number;
  errors: string[];
}

export interface ExportFilters {
  siteId?: string;
  equipmentTypeId?: string;
  brandId?: string;
  status?: string;
  search?: string;
}

export const excelApi = {
  import: (file: File, siteId: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('siteId', siteId);
    return apiClient.post<ImportResult>('/api/excel/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  export: async (filters: ExportFilters = {}) => {
    const resp = await apiClient.get('/api/excel/export', {
      params: filters,
      responseType: 'blob',
    });
    const url = URL.createObjectURL(resp.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spare-parts-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },

  downloadTemplate: async () => {
    const resp = await apiClient.get('/api/excel/template', { responseType: 'blob' });
    const url = URL.createObjectURL(resp.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spare-parts-template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  },
};
