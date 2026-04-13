import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useLogin, useLogout, useRegister } from '../useAuth';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';

jest.mock('@/services/auth.service', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;

const mockUser = { id: 'u1', email: 'user@example.com', name: 'Test User' };

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
    mockAuthService.login.mockResolvedValueOnce({ user: mockUser, token: 'tok' });

    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() });
    act(() => { result.current.mutate({ email: 'user@example.com', password: 'pass' }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAuthService.login).toHaveBeenCalledWith({ email: 'user@example.com', password: 'pass' });
  });

  it('stores auth in the store on success', async () => {
    mockAuthService.login.mockResolvedValueOnce({ user: mockUser, token: 'access-token' });

    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() });
    act(() => { result.current.mutate({ email: 'user@example.com', password: 'pass' }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().accessToken).toBe('access-token');
    expect(useAuthStore.getState().user?.id).toBe('u1');
  });
});

describe('useRegister', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls authService.register with email, password and name', async () => {
    mockAuthService.register.mockResolvedValueOnce({ user: mockUser, token: 'tok' });

    const { result } = renderHook(() => useRegister(), { wrapper: makeWrapper() });
    act(() => { result.current.mutate({ email: 'new@example.com', password: 'pass', name: 'New User' }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAuthService.register).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'pass',
      name: 'New User',
    });
  });

  it('stores auth in the store on success', async () => {
    mockAuthService.register.mockResolvedValueOnce({ user: mockUser, token: 'tok-reg' });

    const { result } = renderHook(() => useRegister(), { wrapper: makeWrapper() });
    act(() => { result.current.mutate({ email: 'new@example.com', password: 'pass', name: 'New User' }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().accessToken).toBe('tok-reg');
  });
});

describe('useLogout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('clears auth store after logout', async () => {
    useAuthStore.getState().setAuth(mockUser, 'access', '');
    mockAuthService.logout.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useLogout(), { wrapper: makeWrapper() });
    act(() => { result.current.mutate(); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('clears auth even when logout call fails', async () => {
    useAuthStore.getState().setAuth(mockUser, 'access', '');
    mockAuthService.logout.mockRejectedValueOnce(new Error('Server error'));

    const { result } = renderHook(() => useLogout(), { wrapper: makeWrapper() });
    act(() => { result.current.mutate(); });

    await waitFor(() => expect(result.current.isError || result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().user).toBeNull();
  });
});
