import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ProfileScreen from '../profile';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuth';

jest.mock('@/store/auth.store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/hooks/useAuth', () => ({ useLogout: jest.fn() }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockUser = { id: 'u1', email: 'user@example.com', name: 'Test User' };
const mockMutate = jest.fn();

function setStoreMock(user: typeof mockUser | null = mockUser) {
  (useAuthStore as unknown as jest.Mock).mockReturnValue(user);
}

function setLogoutMock() {
  (useLogout as jest.Mock).mockReturnValue({ mutate: mockMutate, isPending: false });
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setStoreMock();
    setLogoutMock();
  });

  it('renders without errors', () => {
    expect(() => render(<ProfileScreen />)).not.toThrow();
  });

  it('shows "Profile" heading', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Profile')).toBeTruthy();
  });

  it('shows user name', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Test User')).toBeTruthy();
  });

  it('shows user email', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('user@example.com')).toBeTruthy();
  });

  it('shows logout button', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('LOG OUT')).toBeTruthy();
  });

  it('calls logout mutate on button press', () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText('LOG OUT'));
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });
});
