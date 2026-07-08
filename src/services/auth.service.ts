import api from '@/lib/api';
import type { AuthResponse, UserAuth } from '@learning/shared';
import * as Sentry from '@sentry/react-native';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerified: boolean;
}

export const authService = {
  async login(input: LoginInput): Promise<{ user: UserAuth; token: string; hasOnboarded: boolean }> {
    try {
      Sentry.addBreadcrumb({ category: 'auth', message: 'Login attempt', level: 'info' });

      const { data } = await api.post<AuthResponse>('/auth/login', input);

      Sentry.addBreadcrumb({
        category: 'auth',
        message: `Login success for ${data.user.email}`,
        level: 'info',
      });

      return { user: data.user, token: data.token, hasOnboarded: data.hasOnboarded };
    } catch (err) {
      Sentry.captureException(err, { contexts: { auth: { action: 'login', email: input.email } } });
      throw err;
    }
  },

  async register(input: RegisterInput): Promise<{ user: UserAuth; token: string; hasOnboarded: boolean }> {
    try {
      Sentry.addBreadcrumb({ category: 'auth', message: 'Registration attempt', level: 'info' });

      const { data } = await api.post<AuthResponse>('/auth/register', input);

      Sentry.addBreadcrumb({
        category: 'auth',
        message: `Registration success for ${data.user.email}`,
        level: 'info',
      });

      return { user: data.user, token: data.token, hasOnboarded: data.hasOnboarded };
    } catch (err) {
      Sentry.captureException(err, { contexts: { auth: { action: 'register', email: input.email } } });
      throw err;
    }
  },

  async logout(): Promise<void> {
    // Best-effort — revokes the refresh token server-side and clears the httpOnly
    // cookie. Local state is cleared by useLogout regardless of whether this succeeds.
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore — local sign-out proceeds either way.
    }
  },

  async getMe(): Promise<CurrentUser> {
    const { data } = await api.get<CurrentUser>('/auth/me');
    return data;
  },

  async resendVerification(): Promise<void> {
    await api.post('/auth/resend-verification');
  },
};
