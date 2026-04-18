import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { sitesApi, equipmentTypesApi, brandsApi } from './api';
import type { CreateSiteInput, UpdateSiteInput } from '@spare-part/shared';
import type { CreateEquipmentTypeInput, UpdateEquipmentTypeInput } from '@spare-part/shared';
import type { CreateBrandInput, UpdateBrandInput } from '@spare-part/shared';

// ── Sites ─────────────────────────────────────────────────────────────────

export const SITES_KEY = ['sites'] as const;

export function useSites() {
  return useQuery({ queryKey: SITES_KEY, queryFn: () => sitesApi.list().then((r) => r.data) });
}

export function useSiteStats() {
  return useQuery({
    queryKey: [...SITES_KEY, 'stats'],
    queryFn: () => sitesApi.stats().then((r) => r.data),
  });
}

export function useCreateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSiteInput) => sitesApi.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SITES_KEY });
      toast.success('เพิ่ม Site สำเร็จ');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}

export function useUpdateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSiteInput }) =>
      sitesApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SITES_KEY });
      toast.success('อัปเดต Site สำเร็จ');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}

export function useDeleteSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sitesApi.remove(id).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SITES_KEY });
      toast.success('ปิดใช้งาน Site สำเร็จ');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}

// ── Equipment Types ───────────────────────────────────────────────────────

export const EQUIPMENT_TYPES_KEY = ['equipment-types'] as const;

export function useEquipmentTypes() {
  return useQuery({
    queryKey: EQUIPMENT_TYPES_KEY,
    queryFn: () => equipmentTypesApi.list().then((r) => r.data),
  });
}

export function useCreateEquipmentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEquipmentTypeInput) =>
      equipmentTypesApi.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EQUIPMENT_TYPES_KEY });
      toast.success('เพิ่มประเภทอุปกรณ์สำเร็จ');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}

export function useUpdateEquipmentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEquipmentTypeInput }) =>
      equipmentTypesApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EQUIPMENT_TYPES_KEY });
      toast.success('อัปเดตประเภทอุปกรณ์สำเร็จ');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}

export function useDeleteEquipmentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => equipmentTypesApi.remove(id).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EQUIPMENT_TYPES_KEY });
      toast.success('ลบประเภทอุปกรณ์สำเร็จ');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}

// ── Brands ────────────────────────────────────────────────────────────────

export const BRANDS_KEY = ['brands'] as const;

export function useBrands() {
  return useQuery({ queryKey: BRANDS_KEY, queryFn: () => brandsApi.list().then((r) => r.data) });
}

export function useCreateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBrandInput) => brandsApi.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BRANDS_KEY });
      toast.success('เพิ่ม Brand สำเร็จ');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}

export function useUpdateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBrandInput }) =>
      brandsApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BRANDS_KEY });
      toast.success('อัปเดต Brand สำเร็จ');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}

export function useDeleteBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => brandsApi.remove(id).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BRANDS_KEY });
      toast.success('ลบ Brand สำเร็จ');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'เกิดข้อผิดพลาด'),
  });
}
