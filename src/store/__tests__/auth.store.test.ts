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
      _hasHydrated: false,
    });
  });

  it('has correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state._hasHydrated).toBe(false);
  });

  describe('setAuth', () => {
    it('sets user and accessToken', () => {
      useAuthStore.getState().setAuth(mockUser, 'access-123');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe('access-123');
    });
  });

  describe('clearAuth', () => {
    it('resets user and accessToken to null', () => {
      useAuthStore.getState().setAuth(mockUser, 'access-123');
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
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
