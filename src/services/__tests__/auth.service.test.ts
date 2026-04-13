import { authService } from '../auth.service';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

import api from '@/lib/api';

const mockApi = api as jest.Mocked<typeof api>;

describe('authService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('login', () => {
    it('calls POST /auth/login with credentials', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { token: 'tok', user: { id: 'u1', email: 'user@example.com', name: 'User' } },
      });

      await authService.login({ email: 'user@example.com', password: 'pass123' });

      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'user@example.com',
        password: 'pass123',
      });
    });

    it('returns user and token on success', async () => {
      const mockUser = { id: 'u1', email: 'user@example.com', name: 'User' };
      mockApi.post.mockResolvedValueOnce({ data: { token: 'tok-abc', user: mockUser } });

      const result = await authService.login({ email: 'user@example.com', password: 'pass' });

      expect(result.user).toEqual(mockUser);
      expect(result.token).toBe('tok-abc');
    });

    it('throws and captures exception on failure', async () => {
      const err = new Error('Network error');
      mockApi.post.mockRejectedValueOnce(err);

      await expect(authService.login({ email: 'x@x.com', password: 'p' })).rejects.toThrow('Network error');
    });
  });

  describe('register', () => {
    it('calls POST /auth/register with email, password and name', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { token: 'tok', user: { id: 'u2', email: 'new@example.com', name: 'New User' } },
      });

      await authService.register({ email: 'new@example.com', password: 'pass', name: 'New User' });

      expect(mockApi.post).toHaveBeenCalledWith('/auth/register', {
        email: 'new@example.com',
        password: 'pass',
        name: 'New User',
      });
    });

    it('returns user and token on success', async () => {
      const mockUser = { id: 'u2', email: 'new@example.com', name: 'New User' };
      mockApi.post.mockResolvedValueOnce({ data: { token: 'tok-xyz', user: mockUser } });

      const result = await authService.register({ email: 'new@example.com', password: 'pass', name: 'New User' });

      expect(result.user).toEqual(mockUser);
      expect(result.token).toBe('tok-xyz');
    });
  });

  describe('logout', () => {
    it('resolves without error (stateless JWT — no server call)', async () => {
      await expect(authService.logout()).resolves.toBeUndefined();
      expect(mockApi.post).not.toHaveBeenCalled();
    });
  });
});
