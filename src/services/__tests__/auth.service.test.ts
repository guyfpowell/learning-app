import { authService } from '../auth.service';

// Mock the API module
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

import api from '@/lib/api';
import * as Sentry from '@sentry/react-native';

const mockApi = api as jest.Mocked<typeof api>;
const mockSentry = Sentry as jest.Mocked<typeof Sentry>;

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('calls POST /auth/login with credentials', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { accessToken: 'access-token', refreshToken: 'refresh-abc' },
      });
      mockApi.get.mockResolvedValueOnce({
        data: { id: 'user-1', email: 'donor@example.com', role: 'DONOR', walletBalance: 0 },
      });

      await authService.login({ email: 'donor@example.com', password: 'pass123' });

      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'donor@example.com',
        password: 'pass123',
      });
    });

    it('fetches /users/me with the access token and returns the correct user', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { accessToken: 'access-token', refreshToken: 'refresh-abc' },
      });
      mockApi.get.mockResolvedValueOnce({
        data: { id: 'user-42', email: 'donor@example.com', role: 'DONOR', walletBalance: 500 },
      });

      const result = await authService.login({ email: 'donor@example.com', password: 'pass' });

      expect(mockApi.get).toHaveBeenCalledWith('/users/me', {
        headers: { Authorization: 'Bearer access-token' },
      });
      expect(result.user.id).toBe('user-42');
      expect(result.user.role).toBe('DONOR');
      expect(result.user.email).toBe('donor@example.com');
      expect(result.user.walletBalance).toBe(500);
      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.tokens.refreshToken).toBe('refresh-abc');
    });

    it('logs login attempt and success to Sentry', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { accessToken: 'access-token', refreshToken: 'refresh-abc' },
      });
      mockApi.get.mockResolvedValueOnce({
        data: { id: 'user-42', email: 'donor@example.com', role: 'DONOR', walletBalance: 500 },
      });

      await authService.login({ email: 'donor@example.com', password: 'pass' });

      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'auth',
          message: 'Login attempt',
          level: 'info',
        })
      );
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'auth',
          message: 'Login success for donor@example.com',
          level: 'info',
          data: { role: 'DONOR' },
        })
      );
    });

    it('captures login failures to Sentry', async () => {
      const error = new Error('Invalid credentials');
      mockApi.post.mockRejectedValueOnce(error);

      await expect(authService.login({ email: 'donor@example.com', password: 'wrong' })).rejects.toThrow(error);

      expect(mockSentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          contexts: {
            auth: {
              action: 'login',
              email: 'donor@example.com',
            },
          },
        })
      );
    });
  });

  describe('register', () => {
    it('calls POST /auth/register with role DONOR', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { accessToken: 'access-token', refreshToken: 'refresh-abc' } });
      mockApi.get.mockResolvedValueOnce({
        data: { id: 'user-1', email: 'new@example.com', role: 'DONOR', walletBalance: 0 },
      });

      await authService.register({ email: 'new@example.com', password: 'password' });

      expect(mockApi.post).toHaveBeenCalledWith('/auth/register', {
        email: 'new@example.com',
        password: 'password',
        role: 'DONOR',
      });
    });
  });

  describe('logout', () => {
    it('calls POST /auth/logout', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });

      await authService.logout();

      expect(mockApi.post).toHaveBeenCalledWith('/auth/logout');
    });

    it('logs logout to Sentry', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });

      await authService.logout();

      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'auth',
          message: 'Logout initiated',
          level: 'info',
        })
      );
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'auth',
          message: 'Logout completed successfully',
          level: 'info',
        })
      );
    });

    it('captures logout failures to Sentry', async () => {
      const error = new Error('Network error');
      mockApi.post.mockRejectedValueOnce(error);

      await expect(authService.logout()).rejects.toThrow(error);

      expect(mockSentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          contexts: {
            auth: {
              action: 'logout',
            },
          },
        })
      );
    });
  });

  describe('setPassword', () => {
    it('calls POST /auth/set-password with currentPin and newPassword', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { accessToken: 'new-token', refreshToken: 'new-refresh' },
      });

      await authService.setPassword({ currentPin: '1234', newPassword: 'newpass' });

      expect(mockApi.post).toHaveBeenCalledWith('/auth/set-password', {
        currentPin: '1234',
        newPassword: 'newpass',
      });
    });

    it('logs setPassword to Sentry', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { accessToken: 'new-token', refreshToken: 'new-refresh' },
      });

      await authService.setPassword({ currentPin: '1234', newPassword: 'newpass' });

      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'auth',
          message: 'Set password attempt',
          level: 'info',
        })
      );
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'auth',
          message: 'Password updated successfully',
          level: 'info',
        })
      );
    });
  });

  describe('refresh', () => {
    it('calls POST /auth/refresh with the refresh token', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { accessToken: 'new-token' } });

      const result = await authService.refresh('refresh-token-123');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'refresh-token-123',
      });
      expect(result.accessToken).toBe('new-token');
    });
  });
});
