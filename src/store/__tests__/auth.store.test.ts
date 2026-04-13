// Mock expo-secure-store before importing the store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

import { useAuthStore } from '../auth.store';
import type { UserAuth } from '@learning/shared';

const mockUser: UserAuth = { id: 'u1', email: 'test@example.com', name: 'Test User' };

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      _hasHydrated: false,
    });
  });

  it('has correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state._hasHydrated).toBe(false);
  });

  describe('setAuth', () => {
    it('sets user, accessToken and refreshToken', () => {
      useAuthStore.getState().setAuth(mockUser, 'access-123', 'refresh-456');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe('access-123');
      expect(state.refreshToken).toBe('refresh-456');
    });
  });

  describe('clearAuth', () => {
    it('resets user, accessToken and refreshToken to null', () => {
      useAuthStore.getState().setAuth(mockUser, 'access-123', 'refresh-456');
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
    });
  });

  describe('setHasHydrated', () => {
    it('updates _hasHydrated', () => {
      useAuthStore.getState().setHasHydrated(true);
      expect(useAuthStore.getState()._hasHydrated).toBe(true);

      useAuthStore.getState().setHasHydrated(false);
      expect(useAuthStore.getState()._hasHydrated).toBe(false);
    });
  });
});
