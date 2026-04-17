import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from './api';

interface AuthContextValue {
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ isLoading: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const { accessToken, setAuth, clearAuth } = useAuthStore();

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
