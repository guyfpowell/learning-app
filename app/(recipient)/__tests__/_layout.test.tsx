import React, { act } from 'react';
import { render } from '@testing-library/react-native';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  Tabs: ({ children }: any) => children ?? null,
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

const { useAuthStore } = require('@/store/auth.store');

describe('recipient layout — auth guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace.mockClear();
  });

  it('does not redirect when accessToken is present', () => {
    (useAuthStore as jest.Mock).mockReturnValue({ accessToken: 'valid-token' });

    const RecipientLayout = require('../_layout').default;
    render(<RecipientLayout />);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects to sign-in when accessToken is null', () => {
    (useAuthStore as jest.Mock).mockReturnValue({ accessToken: null });

    const RecipientLayout = require('../_layout').default;
    render(<RecipientLayout />);

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/sign-in');
  });

  it('redirects to sign-in when token clears mid-session', () => {
    (useAuthStore as jest.Mock).mockReturnValue({ accessToken: 'valid-token' });

    const RecipientLayout = require('../_layout').default;
    const { rerender } = render(<RecipientLayout />);

    expect(mockReplace).not.toHaveBeenCalled();

    // Simulate clearAuth() being called — token transitions to null
    (useAuthStore as jest.Mock).mockReturnValue({ accessToken: null });
    act(() => {
      rerender(<RecipientLayout />);
    });

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/sign-in');
  });
});
