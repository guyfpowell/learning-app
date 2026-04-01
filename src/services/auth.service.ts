import api from '@/lib/api';
import type { AuthUser } from '@/store/auth.store';
import type { AuthTokens } from '@pocketchange/shared';
import * as Sentry from '@sentry/react-native';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
}

/** @deprecated Use AuthTokens from @pocketchange/shared directly */
export type TokenResponse = AuthTokens;

export const authService = {
  async login(input: LoginInput): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    try {
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Login attempt',
        level: 'info',
      });

      const { data: tokens } = await api.post<AuthTokens>('/auth/login', input);
      // Fetch authoritative user data — never trust unverified JWT payload client-side
      const { data: user } = await api.get<AuthUser>('/users/me', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      Sentry.addBreadcrumb({
        category: 'auth',
        message: `Login success for ${user.email}`,
        level: 'info',
        data: { role: user.role },
      });

      return { user, tokens };
    } catch (err) {
      Sentry.captureException(err, {
        contexts: {
          auth: {
            action: 'login',
            email: input.email,
          },
        },
      });
      throw err;
    }
  },

  async setPassword(input: { currentPin: string; newPassword: string }): Promise<AuthTokens> {
    try {
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Set password attempt',
        level: 'info',
      });

      const { data } = await api.post<AuthTokens>('/auth/set-password', input);

      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Password updated successfully',
        level: 'info',
      });

      return data;
    } catch (err) {
      Sentry.captureException(err, {
        contexts: {
          auth: {
            action: 'setPassword',
          },
        },
      });
      throw err;
    }
  },

  async register(input: RegisterInput): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    try {
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Registration attempt',
        level: 'info',
      });

      const { data: tokens } = await api.post<AuthTokens>('/auth/register', { ...input, role: 'DONOR' });
      const { data: user } = await api.get<AuthUser>('/users/me', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      Sentry.addBreadcrumb({
        category: 'auth',
        message: `Registration success for ${user.email}`,
        level: 'info',
        data: { role: user.role },
      });

      return { user, tokens };
    } catch (err) {
      Sentry.captureException(err, {
        contexts: {
          auth: {
            action: 'register',
            email: input.email,
          },
        },
      });
      throw err;
    }
  },

  async logout(): Promise<void> {
    try {
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Logout initiated',
        level: 'info',
      });

      await api.post('/auth/logout');

      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Logout completed successfully',
        level: 'info',
      });
    } catch (err) {
      Sentry.captureException(err, {
        contexts: {
          auth: {
            action: 'logout',
          },
        },
      });
      throw err;
    }
  },

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const { data } = await api.post<{ accessToken: string }>('/auth/refresh', {
      refreshToken,
    });
    return data;
  },
};
