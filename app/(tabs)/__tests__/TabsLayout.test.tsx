import React from 'react';
import { render, act } from '@testing-library/react-native';
import { AppState, StyleSheet, type AppStateStatus, type StyleProp, type ViewStyle } from 'react-native';
import { CURRENT_USER_QUERY_KEY } from '@/lib/queryKeys';
import { must } from '@/test-utils/must';

interface CapturedTabsProps {
  children?: React.ReactNode;
  screenListeners?: { focus?: () => void };
  screenOptions?: {
    tabBarStyle?: StyleProp<ViewStyle>;
    tabBarItemStyle?: StyleProp<ViewStyle>;
    tabBarButton?: (props: {
      children: React.ReactNode;
      accessibilityState?: { selected?: boolean };
      testID?: string;
    }) => React.ReactNode;
    tabBarBackground?: () => React.ReactNode;
  };
}

let capturedTabsProps: CapturedTabsProps | null = null;

jest.mock('expo-router', () => ({
  Tabs: Object.assign(
    (props: CapturedTabsProps) => {
      capturedTabsProps = props;
      return props.children ?? null;
    },
    { Screen: () => null }
  ),
}));

jest.mock('expo-blur', () => {
  const { View: MockView } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return { BlurView: (props: object) => createElement(MockView, { testID: 'tab-bar-blur', ...props }) };
});

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
    brandSoft: '#E8F0FC',
    surface: '#FEFDFB',
    borderSubtle: '#EEEBE5',
    bg: '#F8FAFC',
  },
  font: { medium: 'Hanken_500Medium' },
  fontSize: { xs: 12 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xxl: 48 },
  radius: { pill: 999 },
  shadow: { md: {} },
}));

jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: jest.fn(),
}));

jest.mock('@/services/iap.service', () => ({
  iapService: { configure: jest.fn(), logIn: jest.fn(() => Promise.resolve()) },
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: (sel: (s: { user: { id: string } | null }) => unknown) =>
    sel({ user: { id: 'user-1' } }),
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

const tabFocusHandler = (): (() => void) =>
  capturedTabsProps?.screenListeners?.focus
  ?? (() => { throw new Error('Tabs was not given a screenListeners.focus handler'); })();

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

  it('declares tabs in order with Albert rightmost and no Settings tab (076b)', () => {
    const TabsLayout = require('../_layout').default;
    render(<TabsLayout />);
    const names = React.Children.toArray(capturedTabsProps?.children)
      .flatMap((c) => (React.isValidElement<{ name: string }>(c) ? [c.props.name] : []));
    // Hidden tabs are redirected away from by Expo Router 58; non-tab screens are in the root Stack (ADR-016).
    expect(names).toEqual(['lessons', 'progress', 'profile', 'tracks', 'team', 'albert']);
  });

  describe('096 — floating tab bar', () => {
    const screenOptionsOf = () => {
      const options = capturedTabsProps?.screenOptions;
      if (!options) throw new Error('Tabs was not given screenOptions');
      return options;
    };

    it('floats a compact bar as a fully rounded pill, inset from the edges', () => {
      const TabsLayout = require('../_layout').default;
      render(<TabsLayout />);
      const style = StyleSheet.flatten(screenOptionsOf().tabBarStyle);
      expect(style).toMatchObject({
        position: 'absolute',
        start: 24,
        end: 24,
        bottom: 20,
        height: 56,
        paddingTop: 0,
        paddingBottom: 0,
        borderRadius: 999,
        borderTopWidth: 0,
        backgroundColor: 'transparent',
      });
    });

    it('draws the glass with a blur background', () => {
      const TabsLayout = require('../_layout').default;
      render(<TabsLayout />);
      const background = screenOptionsOf().tabBarBackground;
      if (!background) throw new Error('Tabs was not given a tabBarBackground');
      const { getByTestId } = render(<>{background()}</>);
      expect(getByTestId('tab-bar-blur')).toBeTruthy();
    });

    it('highlights only the selected tab with a fully rounded soft fill', () => {
      const TabsLayout = require('../_layout').default;
      render(<TabsLayout />);
      const tabBarButton = capturedTabsProps?.screenOptions?.tabBarButton;
      if (!tabBarButton) throw new Error('Tabs was not given a tabBarButton');
      const selected = render(<>{tabBarButton({ children: null, accessibilityState: { selected: true }, testID: 'sel' })}</>);
      const idle = render(<>{tabBarButton({ children: null, accessibilityState: { selected: false }, testID: 'idle' })}</>);
      expect(StyleSheet.flatten(selected.getByTestId('sel').props.style)).toMatchObject({
        backgroundColor: '#E8F0FC',
        borderRadius: 999,
      });
      expect(StyleSheet.flatten(idle.getByTestId('idle').props.style).backgroundColor).toBeUndefined();
    });

    it('hides the Team tab from the bar while the team feature is off', () => {
      const TabsLayout = require('../_layout').default;
      render(<TabsLayout />);
      const team = React.Children.toArray(capturedTabsProps?.children).flatMap((c) =>
        React.isValidElement<{ name: string; options?: { href?: null } }>(c) && c.props.name === 'team'
          ? [c.props.options]
          : []
      );
      expect(team).toHaveLength(1);
      expect(team[0]?.href).toBeNull();
    });
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

  describe('Chunk A9 — safe-area insets on the verification banner (revised by Ticket 072j)', () => {
    it('banner paddingTop is spacing.sm only — top inset is owned by the layout wrapper', () => {
      mockUseCurrentUser.mockReturnValue({ data: { id: 'u1', emailVerified: false } });
      const TabsLayout = require('../_layout').default;
      const { getByTestId } = render(<TabsLayout />);
      const banner = getByTestId('email-verification-banner');
      const style = Array.isArray(banner.props.style)
        ? Object.assign({}, ...banner.props.style.filter(Boolean))
        : banner.props.style ?? {};
      // spacing.sm = 8; insets.top is now owned by tab-top-inset, not the banner
      expect(style.paddingTop).toBe(8);
    });

    it('does not hard-code a fixed paddingTop on the banner', () => {
      mockUseCurrentUser.mockReturnValue({ data: { id: 'u1', emailVerified: false } });
      const TabsLayout = require('../_layout').default;
      const { getByTestId } = render(<TabsLayout />);
      const banner = getByTestId('email-verification-banner');
      const style = Array.isArray(banner.props.style)
        ? Object.assign({}, ...banner.props.style.filter(Boolean))
        : banner.props.style ?? {};
      expect(style.paddingTop).not.toBe(10);
    });
  });

  describe('Ticket 072j — single top-inset owner', () => {
    it('always renders a top-inset View with paddingTop equal to insets.top', () => {
      mockUseCurrentUser.mockReturnValue({ data: undefined });
      const TabsLayout = require('../_layout').default;
      const { getByTestId } = render(<TabsLayout />);
      const topInset = getByTestId('tab-top-inset');
      const style = Array.isArray(topInset.props.style)
        ? Object.assign({}, ...topInset.props.style.filter(Boolean))
        : topInset.props.style ?? {};
      expect(style.paddingTop).toBe(44); // useSafeAreaInsets returns top:44
    });

    it('tints the top-inset View with the banner colour when the banner is visible', () => {
      mockUseCurrentUser.mockReturnValue({ data: { id: 'u1', emailVerified: false } });
      const TabsLayout = require('../_layout').default;
      const { getByTestId } = render(<TabsLayout />);
      const topInset = getByTestId('tab-top-inset');
      const style = Array.isArray(topInset.props.style)
        ? Object.assign({}, ...topInset.props.style.filter(Boolean))
        : topInset.props.style ?? {};
      expect(style.backgroundColor).toBe('#fffbeb');
    });

    it('uses the normal app background on the top-inset View when the banner is hidden', () => {
      mockUseCurrentUser.mockReturnValue({ data: { id: 'u1', emailVerified: true } });
      const TabsLayout = require('../_layout').default;
      const { getByTestId } = render(<TabsLayout />);
      const topInset = getByTestId('tab-top-inset');
      const style = Array.isArray(topInset.props.style)
        ? Object.assign({}, ...topInset.props.style.filter(Boolean))
        : topInset.props.style ?? {};
      expect(style.backgroundColor).toBe('#F8FAFC'); // colors.bg
    });
  });

  describe('Ticket 072a — banner clears after email verification', () => {
    let addEventListenerSpy: jest.SpiedFunction<typeof AppState.addEventListener>;
    let capturedAppStateHandler: ((state: AppStateStatus) => void) | null;

    beforeEach(() => {
      capturedAppStateHandler = null;
      addEventListenerSpy = jest
        .spyOn(AppState, 'addEventListener')
        .mockImplementation((event, handler) => {
          if (event === 'change') capturedAppStateHandler = handler;
          return { remove: jest.fn() };
        });
    });

    afterEach(() => {
      addEventListenerSpy.mockRestore();
    });

    it('invalidates currentUser query when app returns to active', () => {
      const TabsLayout = require('../_layout').default;
      render(<TabsLayout />);
      expect(capturedAppStateHandler).not.toBeNull();
      act(() => must(capturedAppStateHandler, 'AppState change handler')('active'));
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: CURRENT_USER_QUERY_KEY });
    });

    it('does not invalidate when app enters background', () => {
      const TabsLayout = require('../_layout').default;
      render(<TabsLayout />);
      mockInvalidateQueries.mockClear();
      act(() => must(capturedAppStateHandler, 'AppState change handler')('background'));
      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    });

    it('does not invalidate when app enters inactive state', () => {
      const TabsLayout = require('../_layout').default;
      render(<TabsLayout />);
      mockInvalidateQueries.mockClear();
      act(() => must(capturedAppStateHandler, 'AppState change handler')('inactive'));
      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    });

    it('wires a screenListeners.focus handler on Tabs that invalidates currentUser', () => {
      const TabsLayout = require('../_layout').default;
      render(<TabsLayout />);
      mockInvalidateQueries.mockClear();
      const onFocus = tabFocusHandler();
      act(() => { onFocus(); });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: CURRENT_USER_QUERY_KEY });
    });

    it('invalidates currentUser again on a second tab focus (e.g. Profile -> Progress)', () => {
      const TabsLayout = require('../_layout').default;
      render(<TabsLayout />);
      mockInvalidateQueries.mockClear();
      const onFocus = tabFocusHandler();
      act(() => { onFocus(); }); // e.g. focused Profile
      act(() => { onFocus(); }); // e.g. focused Progress
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
    });

    it('removes the AppState subscription on unmount', () => {
      const mockRemove = jest.fn();
      addEventListenerSpy.mockImplementation((event, handler) => {
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
