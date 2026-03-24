import { authService } from '../auth.service';

// Mock the API module
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

import api from '@/lib/api';

const mockApi = api as jest.Mocked<typeof api>;

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
