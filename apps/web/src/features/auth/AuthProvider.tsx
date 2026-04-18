import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from './api';
import { msalInstance, isMsalConfigured } from './msal';

interface AuthContextValue {
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ isLoading: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const { accessToken, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  // Handle Microsoft redirect callback
  useEffect(() => {
    if (!isMsalConfigured) return;

    msalInstance.initialize().then(() => {
      msalInstance.handleRedirectPromise().then((result) => {
        if (!result) return;
        authApi
          .microsoftLogin(result.idToken)
          .then((res) => {
            setAuth(res.data.user, res.data.accessToken);
            toast.success(`ยินดีต้อนรับ, ${res.data.user.name}`);
            navigate('/dashboard');
          })
          .catch((err: unknown) => {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data
              ?.message;
            toast.error(msg ?? 'เข้าสู่ระบบด้วย Microsoft ไม่สำเร็จ');
          });
      });
    });
  }, []);

  // Verify existing token on mount
  useEffect(() => {
    if (!accessToken) return;
    authApi
      .me()
      .then((res) => setAuth(res.data, accessToken))
      .catch(() => clearAuth());
  }, []);

  return <AuthContext.Provider value={{ isLoading: false }}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}
