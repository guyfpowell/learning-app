import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SignInScreen, { extractError } from '../sign-in';
import { useLogin } from '@/hooks/useAuth';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPush = jest.fn();

jest.mock('@/hooks/useAuth', () => ({ useLogin: jest.fn() }));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockMutate = jest.fn();

function setLoginMock(overrides: Record<string, unknown> = {}) {
  (useLogin as jest.Mock).mockReturnValue({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    ...overrides,
  });
}

// ─── extractError unit tests ──────────────────────────────────────────────────

describe('sign-in screen — extractError', () => {
  it('returns timeout message for ECONNABORTED', () => {
    expect(extractError({ code: 'ECONNABORTED' })).toBe('Request timed out. Please try again.');
  });

  it('returns network message for ERR_NETWORK', () => {
    expect(extractError({ code: 'ERR_NETWORK' })).toBe('Network error. Please check your connection.');
  });

  it('returns server error message from response body', () => {
    expect(extractError({ response: { data: { error: 'Invalid credentials' } } })).toBe('Invalid credentials');
  });

  it('falls back to generic message when no specific error', () => {
    expect(extractError({ response: { data: {} } })).toBe('Something went wrong. Please try again.');
  });

  it('falls back to generic message for unknown error shape', () => {
    expect(extractError({})).toBe('Something went wrong. Please try again.');
  });

  it('returns generic message for 503 response with non-JSON body', () => {
    expect(extractError({ response: { data: '<html>503 Service Unavailable</html>' } })).toBe('Something went wrong. Please try again.');
  });

  it('returns generic message for plain Error object with no response', () => {
    expect(extractError(new Error('Insecure API URL'))).toBe('Something went wrong. Please try again.');
  });
});

// ─── Screen rendering tests ───────────────────────────────────────────────────

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLoginMock();
  });

  it('renders email and password inputs and sign-in button', () => {
    render(<SignInScreen />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('••••••••')).toBeTruthy();
    expect(screen.getByText('SIGN IN')).toBeTruthy();
  });

  it('shows validation errors when submitting empty form', () => {
    render(<SignInScreen />);
    fireEvent.press(screen.getByText('SIGN IN'));
    expect(screen.getByText('Email is required')).toBeTruthy();
    expect(screen.getByText('Password is required')).toBeTruthy();
  });

  it('shows email format error for invalid email', () => {
    render(<SignInScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'not-an-email');
    fireEvent.press(screen.getByText('SIGN IN'));
    expect(screen.getByText('Enter a valid email address')).toBeTruthy();
  });

  it('does not call mutate when form is invalid', () => {
    render(<SignInScreen />);
    fireEvent.press(screen.getByText('SIGN IN'));
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('calls login.mutate with lowercase email and password on valid submit', () => {
    render(<SignInScreen />);
    // Uppercase passes regex validation; the screen lowercases before calling mutate
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'USER@EXAMPLE.COM');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'secret123');
    fireEvent.press(screen.getByText('SIGN IN'));
    expect(mockMutate).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret123',
    });
  });

  it('shows error banner when login fails', () => {
    setLoginMock({
      isError: true,
      error: { response: { data: { error: 'Invalid credentials' } } },
    });
    render(<SignInScreen />);
    expect(screen.getByText('Invalid credentials')).toBeTruthy();
  });

  it('shows loading indicator on button when isPending', () => {
    setLoginMock({ isPending: true });
    const { UNSAFE_getByType } = render(<SignInScreen />);
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    expect(screen.queryByText('SIGN IN')).toBeNull();
  });

  it('navigates to register when "Create one" is pressed', () => {
    render(<SignInScreen />);
    fireEvent.press(screen.getByText('Create one'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/register');
  });
});
