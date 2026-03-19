import api from '@/lib/api';
import type { AuthUser } from '@/store/auth.store';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async login(input: LoginInput): Promise<{ user: AuthUser; tokens: TokenResponse }> {
    const { data: tokens } = await api.post<TokenResponse>('/auth/login', input);
    // Fetch authoritative user data — never trust unverified JWT payload client-side
    const { data: user } = await api.get<AuthUser>('/users/me', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    return { user, tokens };
  },

  async register(input: RegisterInput): Promise<{ user: AuthUser; tokens: TokenResponse }> {
    const { data: tokens } = await api.post<TokenResponse>('/auth/register', { ...input, role: 'DONOR' });
    const { data: user } = await api.get<AuthUser>('/users/me', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    return { user, tokens };
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const { data } = await api.post<{ accessToken: string }>('/auth/refresh', {
      refreshToken,
    });
    return data;
  },
};
