import { userService } from '../user.service';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), delete: jest.fn() },
}));

import api from '@/lib/api';

const mockApi = api as jest.Mocked<typeof api>;

describe('userService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getMe', () => {
    it('calls GET /users/me and returns user', async () => {
      const mockUser = { id: 'u1', email: 'user@example.com', name: 'User' };
      mockApi.get.mockResolvedValueOnce({ data: mockUser });

      const result = await userService.getMe();

      expect(mockApi.get).toHaveBeenCalledWith('/users/me');
      expect(result).toEqual(mockUser);
    });
  });

  describe('getProfile', () => {
    it('calls GET /users/profile and returns profile', async () => {
      const mockProfile = { id: 'p1', userId: 'u1', goal: 'Learn AI', createdAt: new Date(), updatedAt: new Date() };
      mockApi.get.mockResolvedValueOnce({ data: mockProfile });

      const result = await userService.getProfile();

      expect(mockApi.get).toHaveBeenCalledWith('/users/profile');
      expect(result).toEqual(mockProfile);
    });
  });

  describe('getDeletePreflight', () => {
    it('calls GET /users/me/delete-preflight and returns preflight', async () => {
      const mockPreflight = { teamOwnerships: [] };
      mockApi.get.mockResolvedValueOnce({ data: mockPreflight });

      const result = await userService.getDeletePreflight();

      expect(mockApi.get).toHaveBeenCalledWith('/users/me/delete-preflight');
      expect(result).toEqual(mockPreflight);
    });

    it('returns team ownerships in preflight', async () => {
      const mockPreflight = {
        teamOwnerships: [
          { teamId: 't1', teamName: 'Acme', newOwnerName: 'Jane Smith' },
          { teamId: 't2', teamName: 'Empty Team', newOwnerName: null },
        ],
      };
      mockApi.get.mockResolvedValueOnce({ data: mockPreflight });

      const result = await userService.getDeletePreflight();

      expect(result.teamOwnerships).toHaveLength(2);
    });
  });

  describe('deleteAccount', () => {
    it('calls DELETE /users/me with password in body', async () => {
      mockApi.delete.mockResolvedValueOnce({});

      await userService.deleteAccount('my-password');

      expect(mockApi.delete).toHaveBeenCalledWith('/users/me', { data: { password: 'my-password' } });
    });

    it('propagates server errors', async () => {
      const serverError = { response: { data: { code: 'USER_004', message: 'You are the only admin.' } } };
      mockApi.delete.mockRejectedValueOnce(serverError);

      await expect(userService.deleteAccount('pass')).rejects.toEqual(serverError);
    });
  });
});
