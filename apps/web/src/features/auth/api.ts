import { apiClient } from '@/lib/api-client';
import type { LoginInput, RegisterInput } from '@spare-part/shared';
import type { User } from '@spare-part/shared';

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export const authApi = {
  login: (data: LoginInput) => apiClient.post<AuthResponse>('/api/auth/login', data),
  register: (data: RegisterInput) => apiClient.post<AuthResponse>('/api/auth/register', data),
  microsoftLogin: (idToken: string) =>
    apiClient.post<AuthResponse>('/api/auth/microsoft', { idToken }),
  logout: () => apiClient.post('/api/auth/logout'),
  me: () => apiClient.get<User>('/api/auth/me'),
  updateProfile: (data: Partial<Pick<User, 'name' | 'phone'>>) =>
    apiClient.patch<User>('/api/auth/profile', data),
};
