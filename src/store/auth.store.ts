import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

export interface AuthUser {
  id: string;
  email: string;
  role: 'DONOR' | 'VENDOR' | 'ADMIN' | 'RECIPIENT';
  walletBalance: number;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  mustChangePassword: boolean;
  /** True once SecureStore rehydration has completed. Use to gate the auth redirect. */
  _hasHydrated: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string, mustChangePassword?: boolean) => void;
  clearAuth: () => void;
  setHasHydrated: (value: boolean) => void;
  setMustChangePassword: (value: boolean) => void;
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
      mustChangePassword: false,
      _hasHydrated: false,
      setAuth: (user, accessToken, refreshToken, mustChangePassword = false) =>
        set({ user, accessToken, refreshToken, mustChangePassword }),
      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null, mustChangePassword: false }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
      setMustChangePassword: (value) => set({ mustChangePassword: value }),
    }),
    {
      name: 'pocketchange-auth',
      storage: secureStorage,
      // Only persist the token fields — not ephemeral state
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        mustChangePassword: state.mustChangePassword,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
