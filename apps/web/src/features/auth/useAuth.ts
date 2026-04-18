import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from './api';
import { msalInstance, msLoginRequest, isMsalConfigured } from './msal';
import type { LoginInput, RegisterInput } from '@spare-part/shared';

export function useAuth() {
  return useAuthStore();
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: LoginInput) => authApi.login(data).then((r) => r.data),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      toast.success(`ยินดีต้อนรับ, ${data.user.name}`);
      navigate('/dashboard');
    },
    onError: () => {
      toast.error('Email หรือ Password ไม่ถูกต้อง');
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: RegisterInput) => authApi.register(data).then((r) => r.data),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      toast.success('สมัครสมาชิกสำเร็จ');
      navigate('/dashboard');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'เกิดข้อผิดพลาด';
      toast.error(msg);
    },
  });
}

export function useMicrosoftLogin() {
  const [loading, setLoading] = useState(false);

  async function loginWithMicrosoft() {
    if (!isMsalConfigured) {
      toast.error('Microsoft login ยังไม่ได้ตั้งค่า (ติดต่อ Admin)');
      return;
    }
    setLoading(true);
    try {
      await msalInstance.initialize();
      await msalInstance.loginRedirect(msLoginRequest);
      // Page will redirect — loading stays true until redirect
    } catch (err: unknown) {
      console.error('[MS Login Error]', err);
      toast.error('เข้าสู่ระบบด้วย Microsoft ไม่สำเร็จ');
      setLoading(false);
    }
  }

  return { loginWithMicrosoft, loading };
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return () => {
    clearAuth();
    queryClient.clear();
    navigate('/login');
    toast.success('ออกจากระบบแล้ว');
  };
}
