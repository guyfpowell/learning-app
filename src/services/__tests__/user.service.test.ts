import { userService } from '../user.service';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
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
});
