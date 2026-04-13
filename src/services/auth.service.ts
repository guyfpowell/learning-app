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

export const authService = {
  async login(input: LoginInput): Promise<{ user: UserAuth; token: string }> {
    try {
      Sentry.addBreadcrumb({ category: 'auth', message: 'Login attempt', level: 'info' });

      const { data } = await api.post<AuthResponse>('/auth/login', input);

      Sentry.addBreadcrumb({
        category: 'auth',
        message: `Login success for ${data.user.email}`,
        level: 'info',
      });

      return { user: data.user, token: data.token };
    } catch (err) {
      Sentry.captureException(err, { contexts: { auth: { action: 'login', email: input.email } } });
      throw err;
    }
  },

  async register(input: RegisterInput): Promise<{ user: UserAuth; token: string }> {
    try {
      Sentry.addBreadcrumb({ category: 'auth', message: 'Registration attempt', level: 'info' });

      const { data } = await api.post<AuthResponse>('/auth/register', input);

      Sentry.addBreadcrumb({
        category: 'auth',
        message: `Registration success for ${data.user.email}`,
        level: 'info',
      });

      return { user: data.user, token: data.token };
    } catch (err) {
      Sentry.captureException(err, { contexts: { auth: { action: 'register', email: input.email } } });
      throw err;
    }
  },

  async logout(): Promise<void> {
    // Learning backend uses stateless JWT — no server-side logout endpoint needed.
    // Token is cleared locally by useLogout via clearAuth().
  },
};
