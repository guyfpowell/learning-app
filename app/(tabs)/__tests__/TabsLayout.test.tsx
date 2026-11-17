import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { CURRENT_USER_QUERY_KEY } from '@/lib/queryKeys';
import { must } from '@/test-utils/must';

interface CapturedTabsProps {
  children?: React.ReactNode;
  screenListeners?: { focus?: () => void };
  tintColor?: string;
}
interface CapturedTriggerProps { name: string; hidden?: boolean; children?: React.ReactNode }

let mockCapturedTabsProps: CapturedTabsProps | null = null;
let mockCapturedTriggers: CapturedTriggerProps[] = [];

// The native tab bar is the system's, so a test sees what the layout asks of it: the props on the bar
// and on each trigger, and the badge it would draw.
jest.mock('expo-router/native-tabs', () => {
  const { View: MockView, Text: MockText } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  const Trigger = Object.assign(
    (props: CapturedTriggerProps) => {
      mockCapturedTriggers.push(props);
      return createElement(MockView, null, props.children);
    },
    {
      Icon: () => null,
      Label: () => null,
      Badge: ({ children }: { children?: string }) => createElement(MockText, { testID: 'albert-tab-badge' }, children),
    }
  );
  return {
    NativeTabs: Object.assign(
      (props: CapturedTabsProps) => {
        mockCapturedTabsProps = props;
        return createElement(MockView, null, props.children);
      },
      { Trigger }
    ),
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@/theme', () => ({
  colors: {
    teal: '#4F46E5',
    textMuted: '#9CA3AF',
    textBody: '#2A2D3A',
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
  radius: { pill: 999, md: 16 },
  shadow: { md: {} },
}));

// Prefixed `mock` because jest only allows that in a module factory.
let mockHasSuggestion = false;
let mockHasUnseenBuild = false;
jest.mock('@/hooks/useAlbertSuggestion', () => ({ useHasAlbertSuggestion: () => mockHasSuggestion }));
jest.mock('@/hooks/useUnseenBuilds', () => ({ useHasUnseenBuild: () => mockHasUnseenBuild }));

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
  mockCapturedTabsProps?.screenListeners?.focus
  ?? (() => { throw new Error('Tabs was not given a screenListeners.focus handler'); })();

describe('(tabs) layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({ data: undefined });
    mockCapturedTabsProps = null;
    mockCapturedTriggers = [];
    mockHasSuggestion = false;
    mockHasUnseenBuild = false;
  });

  it('renders without errors', () => {
    const TabsLayout = require('../_layout').default;
    expect(() => render(<TabsLayout />)).not.toThrow();
  });

  it('declares tabs in order with Albert rightmost and no Settings tab (076b)', () => {
    const TabsLayout = require('../_layout').default;
    render(<TabsLayout />);
    // Non-tab screens are in the root Stack (ADR-016).
    expect(mockCapturedTriggers.map((t) => t.name)).toEqual(['lessons', 'progress', 'profile', 'tracks', 'team', 'albert']);
  });

  describe('the native tab bar', () => {
    it('tints the selected tab slate grey, not the action cobalt', () => {
      const TabsLayout = require('../_layout').default;
      render(<TabsLayout />);
      expect(mockCapturedTabsProps?.tintColor).toBe('#2A2D3A');
    });

    it('hides the Team tab from the bar while the team feature is off', () => {
      const TabsLayout = require('../_layout').default;
      render(<TabsLayout />);
      const team = mockCapturedTriggers.filter((t) => t.name === 'team');
      expect(team).toHaveLength(1);
      expect(team[0]?.hidden).toBe(true);
    });
  });

  describe('the Albert tab badge (ticket 108)', () => {
    it.each([
      { suggestion: false, unseen: false, dot: false },
      { suggestion: true, unseen: false, dot: true },
      { suggestion: false, unseen: true, dot: true },
      { suggestion: true, unseen: true, dot: true },
    ])('suggestion $suggestion, unseen build $unseen: badge $dot', ({ suggestion, unseen, dot }) => {
      mockHasSuggestion = suggestion;
      mockHasUnseenBuild = unseen;
      const TabsLayout = require('../_layout').default;
      const { queryByTestId } = render(<TabsLayout />);
      expect(queryByTestId('albert-tab-badge') !== null).toBe(dot);
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

  describe('the verification banner is a sand pill under the status bar (board 22)', () => {
    it('shows the pill with Resend when the email is unverified', () => {
      mockUseCurrentUser.mockReturnValue({ data: { id: 'u1', emailVerified: false } });
      const TabsLayout = require('../_layout').default;
      const { getByTestId, getByText } = render(<TabsLayout />);
      expect(getByTestId('email-verification-banner')).toBeTruthy();
      expect(getByText('Resend')).toBeTruthy();
    });

    it('says it was sent, with nothing left to press, after Resend', () => {
      mockUseCurrentUser.mockReturnValue({ data: { id: 'u1', emailVerified: false } });
      mockMutate.mockImplementation((_v: unknown, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.());
      const TabsLayout = require('../_layout').default;
      const { getByText, queryByText } = render(<TabsLayout />);
      fireEvent.press(getByText('Resend'));
      expect(getByText('Verification email sent. Check your inbox.')).toBeTruthy();
      expect(queryByText('Resend')).toBeNull();
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

    it('keeps the app background on the top-inset View when the banner is visible: the pill carries the colour', () => {
      mockUseCurrentUser.mockReturnValue({ data: { id: 'u1', emailVerified: false } });
      const TabsLayout = require('../_layout').default;
      const { getByTestId } = render(<TabsLayout />);
      const topInset = getByTestId('tab-top-inset');
      const style = Array.isArray(topInset.props.style)
        ? Object.assign({}, ...topInset.props.style.filter(Boolean))
        : topInset.props.style ?? {};
      expect(style.backgroundColor).toBe('#F8FAFC');
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
