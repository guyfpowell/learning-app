import React from 'react';
import { render, act } from '@testing-library/react-native';
import { AppState } from 'react-native';

let capturedTabsProps: any = null;

jest.mock('expo-router', () => ({
  Tabs: Object.assign(
    (props: any) => {
      capturedTabsProps = props;
      return props.children ?? null;
    },
    { Screen: () => null }
  ),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@/theme', () => ({
  colors: {
    teal: '#4F46E5',
    textMuted: '#9CA3AF',
    white: '#FFFFFF',
    border: '#E2E8F0',
    brand: '#1C66D2',
    surface: '#FEFDFB',
    borderSubtle: '#EEEBE5',
  },
  font: { medium: 'Hanken_500Medium' },
  fontSize: { xs: 12 },
  spacing: { sm: 8 },
}));

jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

const mockUseCurrentUser = jest.fn();
const mockMutate = jest.fn();

jest.mock('@/hooks/useEmailVerification', () => ({
  useCurrentUser: () => mockUseCurrentUser(),
  useResendVerification: () => ({ mutate: mockMutate, isPending: false }),
}));

const mockInvalidateQueries = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

describe('(tabs) layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({ data: undefined });
    capturedTabsProps = null;
  });

  it('renders without errors', () => {
    const TabsLayout = require('../_layout').default;
    expect(() => render(<TabsLayout />)).not.toThrow();
  });

  it('shows the verification banner when the current user is unverified', () => {
    mockUseCurrentUser.mockReturnValue({ data: { id: 'u1', emailVerified: false } });
    const TabsLayout = require('../_layout').default;
    const { getByText } = render(<TabsLayout />);
    expect(getByText(/verify your email/i)).toBeTruthy();
  });

  it('hides the verification banner when the current user is verified', () => {
    mockUseCurrentUser.mockReturnValue({ data: { id: 'u1', emailVerified: true } });
    const TabsLayout = require('../_layout').default;
    const { queryByText } = render(<TabsLayout />);
    expect(queryByText(/verify your email/i)).toBeNull();
  });

  describe('Chunk A9 — safe-area insets on the verification banner', () => {
    it('applies top padding from safe-area insets to the banner', () => {
      mockUseCurrentUser.mockReturnValue({ data: { id: 'u1', emailVerified: false } });
      const TabsLayout = require('../_layout').default;
      const { getByTestId } = render(<TabsLayout />);
      const banner = getByTestId('email-verification-banner');
      const style = Array.isArray(banner.props.style)
        ? Object.assign({}, ...banner.props.style.filter(Boolean))
        : banner.props.style ?? {};
      // useSafeAreaInsets returns top:44; spacing.sm = 8; total = 52
      expect(style.paddingTop).toBe(52);
    });

    it('does not hard-code a fixed paddingTop on the banner', () => {
      // The old banner used paddingVertical: 10 (no safe-area awareness).
      // A9 must compute from insets rather than a constant.
      mockUseCurrentUser.mockReturnValue({ data: { id: 'u1', emailVerified: false } });
      const TabsLayout = require('../_layout').default;
      const { getByTestId } = render(<TabsLayout />);
      const banner = getByTestId('email-verification-banner');
      const style = Array.isArray(banner.props.style)
        ? Object.assign({}, ...banner.props.style.filter(Boolean))
        : banner.props.style ?? {};
      // A hard-coded 10px would not equal 52
      expect(style.paddingTop).not.toBe(10);
    });
  });

  describe('Ticket 072a — banner clears after email verification', () => {
    let addEventListenerSpy: jest.SpyInstance;
    let capturedAppStateHandler: ((state: string) => void) | null;

    beforeEach(() => {
      capturedAppStateHandler = null;
      addEventListenerSpy = jest
        .spyOn(AppState, 'addEventListener')
        .mockImplementation((event: any, handler: any) => {
          if (event === 'change') capturedAppStateHandler = handler;
          return { remove: jest.fn() } as any;
        });
    });

    afterEach(() => {
      addEventListenerSpy.mockRestore();
    });

    it('invalidates currentUser query when app returns to active', () => {
      const TabsLayout = require('../_layout').default;
      render(<TabsLayout />);
      expect(capturedAppStateHandler).not.toBeNull();
      act(() => capturedAppStateHandler!('active'));
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['auth', 'me'] });
    });

    it('does not invalidate when app enters background', () => {
      const TabsLayout = require('../_layout').default;
      render(<TabsLayout />);
      mockInvalidateQueries.mockClear();
      act(() => capturedAppStateHandler!('background'));
      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    });

    it('does not invalidate when app enters inactive state', () => {
      const TabsLayout = require('../_layout').default;
      render(<TabsLayout />);
      mockInvalidateQueries.mockClear();
      act(() => capturedAppStateHandler!('inactive'));
      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    });

    it('wires a screenListeners.focus handler on Tabs that invalidates currentUser', () => {
      const TabsLayout = require('../_layout').default;
      render(<TabsLayout />);
      mockInvalidateQueries.mockClear();
      const onFocus = capturedTabsProps?.screenListeners?.focus;
      expect(typeof onFocus).toBe('function');
      act(() => onFocus());
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['auth', 'me'] });
    });

    it('invalidates currentUser again on a second tab focus (e.g. Profile -> Progress)', () => {
      const TabsLayout = require('../_layout').default;
      render(<TabsLayout />);
      mockInvalidateQueries.mockClear();
      const onFocus = capturedTabsProps.screenListeners.focus;
      act(() => onFocus()); // e.g. focused Profile
      act(() => onFocus()); // e.g. focused Progress
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
    });

    it('removes the AppState subscription on unmount', () => {
      const mockRemove = jest.fn();
      addEventListenerSpy.mockImplementation((event: any, handler: any) => {
        if (event === 'change') capturedAppStateHandler = handler;
        return { remove: mockRemove };
      });
      const TabsLayout = require('../_layout').default;
      const { unmount } = render(<TabsLayout />);
      unmount();
      expect(mockRemove).toHaveBeenCalled();
    });
  });
});
