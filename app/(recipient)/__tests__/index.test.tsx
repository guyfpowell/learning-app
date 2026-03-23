import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RecipientHomeScreen from '../index';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('@/hooks/useRecipientSelf', () => ({
  useRecipientSelfProfile: jest.fn(() => ({
    data: { firstName: 'Jay', balance: 1050, shortCode: 'ABC123' },
    isLoading: false,
    refetch: jest.fn(),
  })),
}));

const mockLogoutMutate = jest.fn();

jest.mock('@/hooks/useAuth', () => ({
  useLogout: jest.fn(() => ({
    mutate: mockLogoutMutate,
    isPending: false,
  })),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(RecipientHomeScreen)
    )
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RecipientHomeScreen — logout button', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a Log out button', () => {
    renderScreen();
    expect(screen.getByText('LOG OUT')).toBeTruthy();
  });

  it('calls useLogout().mutate when the button is pressed', () => {
    renderScreen();
    fireEvent.press(screen.getByText('LOG OUT'));
    expect(mockLogoutMutate).toHaveBeenCalledTimes(1);
  });

  it('passes loading state to the button while logout is pending', () => {
    const { useLogout } = require('@/hooks/useAuth');
    useLogout.mockReturnValueOnce({ mutate: mockLogoutMutate, isPending: true });

    renderScreen();

    // Button hides label text and shows ActivityIndicator when loading
    expect(screen.queryByText('LOG OUT')).toBeNull();
  });
});
