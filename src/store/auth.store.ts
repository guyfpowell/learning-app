import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import type { UserAuth } from '@learning/shared';

interface AuthState {
  user: UserAuth | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** True once SecureStore rehydration has completed. Use to gate the auth redirect. */
  _hasHydrated: boolean;
  setAuth: (user: UserAuth, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setHasHydrated: (value: boolean) => void;
}

const secureStorage = createJSONStorage(() => ({
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
}));

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      _hasHydrated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'learning-auth',
      storage: secureStorage,
      // Only persist the token fields — not ephemeral state
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
