import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import RegisterScreen from '../register';
import { useRegister } from '@/hooks/useAuth';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockBack = jest.fn();

jest.mock('@/hooks/useAuth', () => ({ useRegister: jest.fn() }));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockMutate = jest.fn();

function setRegisterMock(overrides: Record<string, unknown> = {}) {
  (useRegister as jest.Mock).mockReturnValue({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    ...overrides,
  });
}

function fillValidForm() {
  fireEvent.changeText(screen.getByPlaceholderText('Your full name'), 'Jane Doe');
  fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
  fireEvent.changeText(screen.getByPlaceholderText('Min 10 characters'), 'TestPass1!');
  fireEvent.changeText(screen.getByPlaceholderText('Repeat your password'), 'TestPass1!');
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setRegisterMock();
  });

  it('renders name, email, password, confirm inputs and submit button', () => {
    render(<RegisterScreen />);
    expect(screen.getByPlaceholderText('Your full name')).toBeTruthy();
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('Min 10 characters')).toBeTruthy();
    expect(screen.getByPlaceholderText('Repeat your password')).toBeTruthy();
    expect(screen.getByText('CREATE ACCOUNT')).toBeTruthy();
  });

  it('shows validation errors when submitting empty form', () => {
    render(<RegisterScreen />);
    fireEvent.press(screen.getByText('CREATE ACCOUNT'));
    expect(screen.getByText('Name is required')).toBeTruthy();
    expect(screen.getByText('Email is required')).toBeTruthy();
    expect(screen.getByText('Password is required')).toBeTruthy();
    expect(screen.getByText('Please confirm your password')).toBeTruthy();
  });

  it('shows password complexity error for a password that only fails length', () => {
    render(<RegisterScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Your full name'), 'Jane');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Min 10 characters'), 'Short1!');
    fireEvent.press(screen.getByText('CREATE ACCOUNT'));
    expect(screen.getByText('Password must include: At least 10 characters')).toBeTruthy();
  });

  it('shows password mismatch error', () => {
    render(<RegisterScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Your full name'), 'Jane');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Min 10 characters'), 'TestPass1!');
    fireEvent.changeText(screen.getByPlaceholderText('Repeat your password'), 'TestPass2!');
    fireEvent.press(screen.getByText('CREATE ACCOUNT'));
    expect(screen.getByText('Passwords do not match')).toBeTruthy();
  });

  it('does not call mutate when form is invalid', () => {
    render(<RegisterScreen />);
    fireEvent.press(screen.getByText('CREATE ACCOUNT'));
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('calls register.mutate with name, email and password (not confirm)', () => {
    render(<RegisterScreen />);
    fillValidForm();
    fireEvent.press(screen.getByText('CREATE ACCOUNT'));
    expect(mockMutate).toHaveBeenCalledWith({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'TestPass1!',
    });
  });

  it('trims name and lowercases email on submit', () => {
    render(<RegisterScreen />);
    // Uppercase email passes regex validation; the screen lowercases before calling mutate
    // Name has trimable whitespace; the screen trims before calling mutate
    fireEvent.changeText(screen.getByPlaceholderText('Your full name'), '  Jane Doe  ');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'JANE@EXAMPLE.COM');
    fireEvent.changeText(screen.getByPlaceholderText('Min 10 characters'), 'TestPass1!');
    fireEvent.changeText(screen.getByPlaceholderText('Repeat your password'), 'TestPass1!');
    fireEvent.press(screen.getByText('CREATE ACCOUNT'));
    expect(mockMutate).toHaveBeenCalledWith({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'TestPass1!',
    });
  });

  it('shows error banner when registration fails', () => {
    setRegisterMock({
      isError: true,
      error: { response: { data: { error: 'Email already registered' } } },
    });
    render(<RegisterScreen />);
    expect(screen.getByText('Email already registered')).toBeTruthy();
  });

  it('shows timeout message for ECONNABORTED error', () => {
    setRegisterMock({ isError: true, error: { code: 'ECONNABORTED' } });
    render(<RegisterScreen />);
    expect(screen.getByText('Request timed out. Please try again.')).toBeTruthy();
  });

  it('shows network message for ERR_NETWORK error', () => {
    setRegisterMock({ isError: true, error: { code: 'ERR_NETWORK' } });
    render(<RegisterScreen />);
    expect(screen.getByText('Network error. Please check your connection.')).toBeTruthy();
  });

  it('shows success banner when registration succeeds', () => {
    setRegisterMock({ isSuccess: true });
    render(<RegisterScreen />);
    expect(screen.getByText('Account created! Redirecting…')).toBeTruthy();
  });

  it('shows loading indicator on button when isPending', () => {
    setRegisterMock({ isPending: true });
    const { UNSAFE_getByType } = render(<RegisterScreen />);
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    expect(screen.queryByText('CREATE ACCOUNT')).toBeNull();
  });

  it('navigates back when "Sign in" is pressed', () => {
    render(<RegisterScreen />);
    fireEvent.press(screen.getByText('Sign in'));
    expect(mockBack).toHaveBeenCalled();
  });
});
