import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useLogin, useLogout, useRegister, useSetPassword } from '../useAuth';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';

jest.mock('@/services/auth.service', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    setPassword: jest.fn(),
  },
}));

// Mock expo-secure-store for zustand persist
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, _hasHydrated: false });
  });

  it('calls authService.login with credentials', async () => {
    mockAuthService.login.mockResolvedValueOnce({
      user: { id: 'u1', email: 'donor@example.com', role: 'DONOR', walletBalance: 0 },
      tokens: { accessToken: 'acc', refreshToken: 'ref', mustChangePassword: false },
    });

    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() });

    act(() => {
      result.current.mutate({ email: 'donor@example.com', password: 'pass' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'donor@example.com',
      password: 'pass',
    });
  });

  it('stores auth in the store on success', async () => {
    const user = { id: 'u1', email: 'donor@example.com', role: 'DONOR' as const, walletBalance: 0 };
    mockAuthService.login.mockResolvedValueOnce({
      user,
      tokens: { accessToken: 'access-token', refreshToken: 'refresh-token', mustChangePassword: false },
    });

    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() });

    act(() => {
      result.current.mutate({ email: 'donor@example.com', password: 'pass' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().accessToken).toBe('access-token');
    expect(useAuthStore.getState().user?.id).toBe('u1');
  });
});

describe('useRegister', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls authService.register', async () => {
    mockAuthService.register.mockResolvedValueOnce({
      user: { id: 'user-1', email: 'new@example.com', role: 'DONOR', walletBalance: 0 },
      tokens: { accessToken: 'access-token', refreshToken: 'refresh-abc', mustChangePassword: false },
    });

    const { result } = renderHook(() => useRegister(), { wrapper: makeWrapper() });

    act(() => {
      result.current.mutate({ email: 'new@example.com', password: 'password' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAuthService.register).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password',
    });
  });
});

describe('useLogout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('clears auth store after logout', async () => {
    const user = { id: 'u1', email: 'donor@example.com', role: 'DONOR' as const, walletBalance: 0 };
    useAuthStore.getState().setAuth(user, 'access', 'refresh');

    mockAuthService.logout.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useLogout(), { wrapper: makeWrapper() });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('clears auth even when server call fails', async () => {
    const user = { id: 'u1', email: 'donor@example.com', role: 'DONOR' as const, walletBalance: 0 };
    useAuthStore.getState().setAuth(user, 'access', 'refresh');

    mockAuthService.logout.mockRejectedValueOnce(new Error('Server error'));

    const { result } = renderHook(() => useLogout(), { wrapper: makeWrapper() });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError || result.current.isSuccess).toBe(true));
    // clearAuth is called in onSettled which runs regardless
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe('useLogin — RECIPIENT routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, mustChangePassword: false, _hasHydrated: false });
  });

  it('sets mustChangePassword: true in store when login response requires it', async () => {
    const user = { id: 'u1', email: 'jay@pocketchange.org.uk', role: 'RECIPIENT' as const, walletBalance: 0 };
    mockAuthService.login.mockResolvedValueOnce({
      user,
      tokens: { accessToken: 'acc', refreshToken: 'ref', mustChangePassword: true },
    });

    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() });
    act(() => { result.current.mutate({ email: 'jay@pocketchange.org.uk', password: '123456' }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(useAuthStore.getState().mustChangePassword).toBe(true);
  });

  it('does not call router.replace — routing is handled by AuthGate', async () => {
    const mockReplace = jest.fn();
    jest.spyOn(require('expo-router'), 'useRouter').mockReturnValue({ replace: mockReplace, push: jest.fn(), back: jest.fn() });

    const user = { id: 'u1', email: 'pete@pocketchange.org.uk', role: 'RECIPIENT' as const, walletBalance: 0 };
    mockAuthService.login.mockResolvedValueOnce({
      user,
      tokens: { accessToken: 'acc', refreshToken: 'ref', mustChangePassword: true },
    });

    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() });
    act(() => { result.current.mutate({ email: 'pete@pocketchange.org.uk', password: '12345678' }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('useSetPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const user = { id: 'u1', email: 'jay@pocketchange.org.uk', role: 'RECIPIENT' as const, walletBalance: 0 };
    useAuthStore.setState({ user, accessToken: 'old-access', refreshToken: 'old-refresh', mustChangePassword: true, _hasHydrated: true });
  });

  it('calls authService.setPassword and clears mustChangePassword flag', async () => {
    (mockAuthService as any).setPassword.mockResolvedValueOnce({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      mustChangePassword: false,
    });

    const { result } = renderHook(() => useSetPassword(), { wrapper: makeWrapper() });
    act(() => {
      result.current.mutate({ currentPin: '123456', newPassword: 'newSecurePass1!' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().mustChangePassword).toBe(false);
    expect(useAuthStore.getState().accessToken).toBe('new-access');
  });
});
