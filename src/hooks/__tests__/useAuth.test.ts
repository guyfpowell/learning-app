import { renderHook, waitFor, act } from '@testing-library/react-native';
import { queryWrapper } from '@/test-utils/queryClient';
import { useLogin, useLogout, useRegister } from '../useAuth';
import * as Sentry from '@sentry/react-native';
import { authService } from '@/services/auth.service';
import { userService } from '@/services/user.service';
import { useAuthStore } from '@/store/auth.store';

jest.mock('@/services/auth.service', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  },
}));

// register calls syncTimezone(), which hits userService. Unmocked it made a real
// request, and the 401 interceptor in api.ts signed the user back out mid-test.
jest.mock('@/services/user.service', () => ({
  userService: {
    updateProfile: jest.fn(() => Promise.resolve({})),
    syncTimezone: jest.fn(() => Promise.resolve()),
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

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockUserService = userService as jest.Mocked<typeof userService>;

const mockUser = { id: 'u1', email: 'user@example.com', name: 'Test User' };

// A plain answer outlives its test, so every describe starts from unanswered service mocks.
function resetServiceMocks() {
  jest.clearAllMocks();
  Object.values(mockAuthService).forEach((fn) => fn.mockReset());
  mockUserService.syncTimezone.mockResolvedValue(undefined);
}

describe('useLogin', () => {
  beforeEach(() => {
    resetServiceMocks();
    useAuthStore.setState({ user: null, accessToken: null, _hasHydrated: false });
  });

  it('calls authService.login with credentials', async () => {
    mockAuthService.login.mockResolvedValue({ user: mockUser, token: 'tok' });

    const { result } = renderHook(() => useLogin(), { wrapper: queryWrapper() });
    act(() => { result.current.mutate({ email: 'user@example.com', password: 'pass' }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAuthService.login).toHaveBeenCalledWith({ email: 'user@example.com', password: 'pass' });
  });

  it('stores auth in the store on success', async () => {
    mockAuthService.login.mockResolvedValue({ user: mockUser, token: 'access-token' });

    const { result } = renderHook(() => useLogin(), { wrapper: queryWrapper() });
    act(() => { result.current.mutate({ email: 'user@example.com', password: 'pass' }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().accessToken).toBe('access-token');
    expect(useAuthStore.getState().user?.id).toBe('u1');
  });
});

describe('useRegister', () => {
  beforeEach(resetServiceMocks);

  it('calls authService.register with email, password and name', async () => {
    mockAuthService.register.mockResolvedValue({ user: mockUser, token: 'tok' });

    const { result } = renderHook(() => useRegister(), { wrapper: queryWrapper() });
    act(() => { result.current.mutate({ email: 'new@example.com', password: 'pass', name: 'New User' }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAuthService.register).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'pass',
      name: 'New User',
    });
  });

  it('stores auth in the store on success', async () => {
    mockAuthService.register.mockResolvedValue({ user: mockUser, token: 'tok-reg' });

    const { result } = renderHook(() => useRegister(), { wrapper: queryWrapper() });
    act(() => { result.current.mutate({ email: 'new@example.com', password: 'pass', name: 'New User' }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().accessToken).toBe('tok-reg');
  });

  it('still signs the user in and logs a breadcrumb when the timezone sync fails', async () => {
    mockAuthService.register.mockResolvedValue({ user: mockUser, token: 'tok-tz' });
    mockUserService.syncTimezone.mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useRegister(), { wrapper: queryWrapper() });
    act(() => { result.current.mutate({ email: 'new@example.com', password: 'pass', name: 'New User' }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: 'auth',
      message: 'Timezone sync failed after registration',
      level: 'warning',
      data: { err: 'Error: Network Error' },
    }));
    expect(useAuthStore.getState().accessToken).toBe('tok-tz');
  });
});

describe('useLogout', () => {
  beforeEach(resetServiceMocks);

  it('clears auth store after logout', async () => {
    useAuthStore.getState().setAuth(mockUser, 'access');
    mockAuthService.logout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogout(), { wrapper: queryWrapper() });
    act(() => { result.current.mutate(); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('clears auth even when logout call fails', async () => {
    useAuthStore.getState().setAuth(mockUser, 'access');
    mockAuthService.logout.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useLogout(), { wrapper: queryWrapper() });
    act(() => { result.current.mutate(); });

    await waitFor(() => expect(result.current.isError || result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().user).toBeNull();
  });
});
