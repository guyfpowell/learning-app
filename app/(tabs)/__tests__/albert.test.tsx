import React from 'react';
import { Alert, type AlertButton } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import AlbertScreen from '../albert';
import { usePaths } from '@/hooks/useTrack';
import { useCurrentUser } from '@/hooks/useEmailVerification';
import { useUpdateTrackPlan } from '@/hooks/useTrackBuilder';
import { ALBERT_STEPS, type SessionUser, type UserPath } from '@learning/shared';
import { makeCustomPath, makeTrackPath } from '@/test-utils/paths';
import { BUILD_ROUTE, TRACKS_ROUTE } from '@/lib/routes';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/hooks/useTrack', () => ({
  usePaths: jest.fn(),
}));

jest.mock('@/hooks/useEmailVerification', () => ({
  useCurrentUser: jest.fn(),
}));

jest.mock('@/hooks/useTrackBuilder', () => ({
  useUpdateTrackPlan: jest.fn(),
}));

// The section has its own suite; here it only has to be rendered once per path with a proposal.
jest.mock('@/components/albert/PathProposalSection', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    PathProposalSection: ({ path }: { path: { id: string } }) => <View testID={`stub-proposal-${path.id}`} />,
  };
});

let capturedEdges: string[] | undefined;
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, edges }: { children: React.ReactNode; edges?: string[] }) => {
    capturedEdges = edges;
    return <>{children}</>;
  },
}));

// ── Fixtures ────────────────────────────────────────────────────────────────

const unfinishedPath = makeCustomPath({ id: 'plan-1', name: 'My AI Path', percentComplete: 40, isActive: true });

const finishedPath = makeCustomPath({ id: 'plan-2', name: 'Completed Path', percentComplete: 100, isActive: false });

const trackPath = makeTrackPath({ id: 'skill-3', name: 'Some Track', percentComplete: 50, isActive: false });

// ── Helpers ──────────────────────────────────────────────────────────────────

type UserState = 'premium' | 'unspent' | 'spent';

/** premium: subscriber · unspent: free, no path saved yet · spent: free, the one path is saved (079a). */
function setUser(state: UserState) {
  const user = {
    isPremium: state === 'premium',
    albertAllowance: { used: state === 'unspent' ? 0 : 1, total: 1 },
  } as SessionUser;
  (useCurrentUser as jest.Mock).mockReturnValue({ data: user, isLoading: false });
}

function setPaths(paths: UserPath[] | undefined, isLoading = false) {
  (usePaths as jest.Mock).mockReturnValue({ data: paths, isLoading, isError: false });
}

const mockMutate = jest.fn();
const mockUpdatePlan = { mutate: mockMutate, isError: false, error: null };

function setUpdatePlan(overrides: Partial<typeof mockUpdatePlan> = {}) {
  (useUpdateTrackPlan as jest.Mock).mockReturnValue({ ...mockUpdatePlan, ...overrides });
}

let alertSpy: jest.SpiedFunction<typeof Alert.alert>;

/**
 * Presses the first Alert's button with `style`, inside `act` so the state it sets is flushed.
 * Throws if the button is missing; a button with no `onPress` just dismisses, so pressing it does nothing.
 */
function pressAlertButton(style: AlertButton['style']) {
  const button = alertSpy.mock.calls[0]?.[2]?.find(b => b.style === style);
  if (!button) throw new Error(`The Alert has no ${style} button`);
  const { onPress } = button;
  if (onPress) act(() => { onPress(); });
}

// ── Suite ────────────────────────────────────────────────────────────────────

describe('AlbertScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert');
    capturedEdges = undefined;
    setUser('spent');
    setPaths([]);
    setUpdatePlan();
  });

  // ── Existing behaviour (no custom paths) ────────────────────────────────

  it('shows the Meet Albert heading and intro copy', () => {
    render(<AlbertScreen />);
    expect(screen.getByText('Meet Albert')).toBeTruthy();
    expect(screen.getByTestId('albert-intro')).toBeTruthy();
  });

  it('offers Start to a premium user (no paths)', () => {
    setUser('premium');
    render(<AlbertScreen />);
    expect(screen.getByTestId('build-path-start')).toBeTruthy();
    expect(screen.queryByTestId('build-path-upgrade')).toBeNull();
  });

  it('routes a premium user to the builder when no paths exist', () => {
    setUser('premium');
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('build-path-start'));
    expect(mockPush).toHaveBeenCalledWith(BUILD_ROUTE);
  });

  it('offers an upgrade to a free user who has spent the allowance, instead of hiding the card', () => {
    render(<AlbertScreen />);
    expect(screen.getByTestId('build-path-card')).toBeTruthy();
    expect(screen.getByTestId('build-path-upgrade')).toBeTruthy();
    expect(screen.queryByTestId('build-path-start')).toBeNull();
  });

  it('never routes a spent free user into the builder; opens the upgrade modal', () => {
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('build-path-upgrade'));
    expect(mockPush).not.toHaveBeenCalledWith(BUILD_ROUTE);
    expect(screen.getByTestId('premium-modal')).toBeTruthy();
  });

  it('Upgrade now in the modal navigates to the paywall (073b-5)', () => {
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('build-path-upgrade'));
    fireEvent.press(screen.getByTestId('upgrade-now-btn'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/paywall');
  });

  it('does not crash while the user is still loading, and shows no buttons', () => {
    (useCurrentUser as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });
    expect(() => render(<AlbertScreen />)).not.toThrow();
    expect(screen.queryByTestId('build-path-start')).toBeNull();
    expect(screen.queryByTestId('build-path-upgrade')).toBeNull();
  });

  it('treats a failed user fetch as locked (the server gates the save anyway)', () => {
    (useCurrentUser as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
    render(<AlbertScreen />);
    expect(screen.getByTestId('build-path-upgrade')).toBeTruthy();
  });

  it('lists the shared four Albert steps, ending with Tend the path (079g7)', () => {
    render(<AlbertScreen />);
    ALBERT_STEPS.forEach(step => {
      expect(screen.getByText(step.title)).toBeTruthy();
      expect(screen.getByText(step.body)).toBeTruthy();
    });
    expect(ALBERT_STEPS).toHaveLength(4);
  });

  it('renders a suggestion section for every custom path with a proposal, finished or not (079g7)', () => {
    setUser('premium');
    setPaths([
      { ...unfinishedPath, hasProposal: true },
      { ...finishedPath, hasProposal: true },
      makeCustomPath({ id: 'plan-3', hasProposal: false }),
      trackPath,
    ]);
    render(<AlbertScreen />);
    expect(screen.getByTestId('stub-proposal-plan-1')).toBeTruthy();
    expect(screen.getByTestId('stub-proposal-plan-2')).toBeTruthy();
    expect(screen.queryByTestId('stub-proposal-plan-3')).toBeNull();
    expect(screen.queryByTestId('stub-proposal-skill-3')).toBeNull();
  });

  it('shows no suggestion section for a user with only a curated track (079g7)', () => {
    setPaths([trackPath]);
    render(<AlbertScreen />);
    expect(screen.queryByTestId(/^stub-proposal-/)).toBeNull();
    expect(screen.getByTestId('build-path-card')).toBeTruthy();
  });

  it('uses edges=[left,right,bottom] so the tab layout owns the top inset', () => {
    render(<AlbertScreen />);
    expect(capturedEdges).toEqual(['left', 'right', 'bottom']);
  });

  // ── Allowance (079a) ────────────────────────────────────────────────────

  it('offers Start to a free user who has not saved a path yet (building is free)', () => {
    setUser('unspent');
    render(<AlbertScreen />);
    expect(screen.getByTestId('build-path-start')).toBeTruthy();
    expect(screen.queryByTestId('build-path-upgrade')).toBeNull();
  });

  it('routes a free user with the allowance unspent to the builder', () => {
    setUser('unspent');
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('build-path-start'));
    expect(mockPush).toHaveBeenCalledWith(BUILD_ROUTE);
    expect(screen.queryByTestId('premium-modal')).toBeNull();
  });

  it('shows the used-your-free-path copy to a free user who has spent it, and keeps the card visible', () => {
    setUser('spent');
    render(<AlbertScreen />);
    expect(screen.getByTestId('build-path-card')).toBeTruthy();
    expect(screen.getByTestId('allowance-used')).toBeTruthy();
    expect(screen.getByText('PREMIUM')).toBeTruthy();
  });

  it('shows no used-your-free-path copy to a premium user or an unspent free user', () => {
    setUser('premium');
    const { rerender } = render(<AlbertScreen />);
    expect(screen.queryByTestId('allowance-used')).toBeNull();
    setUser('unspent');
    rerender(<AlbertScreen />);
    expect(screen.queryByTestId('allowance-used')).toBeNull();
  });

  it('shows the used copy beside a spent free user\'s saved path, with Create a NEW path locked', () => {
    setUser('spent');
    setPaths([unfinishedPath]);
    render(<AlbertScreen />);
    expect(screen.getByTestId('view-my-path')).toBeTruthy();
    expect(screen.getByTestId('allowance-used')).toBeTruthy();
  });

  it('shows the used copy in the all-complete state for a spent free user', () => {
    setUser('spent');
    setPaths([finishedPath]);
    render(<AlbertScreen />);
    expect(screen.getByTestId('allowance-used')).toBeTruthy();
    expect(screen.getByTestId('build-another')).toBeTruthy();
    fireEvent.press(screen.getByTestId('build-another'));
    expect(screen.getByTestId('premium-modal')).toBeTruthy();
  });

  // ── Track-only paths: treated as no custom paths ─────────────────────────

  it('shows no-paths card when only track enrollments exist (no custom paths)', () => {
    setPaths([trackPath]);
    render(<AlbertScreen />);
    expect(screen.queryByTestId('view-my-path')).toBeNull();
    expect(screen.queryByTestId('build-another')).toBeNull();
    expect(screen.getByTestId('build-path-card')).toBeTruthy();
  });

  // ── Loading state ────────────────────────────────────────────────────────

  it('shows a spinner while paths are loading (no Start button visible)', () => {
    setUser('premium');
    setPaths(undefined, true);
    render(<AlbertScreen />);
    expect(screen.queryByTestId('build-path-start')).toBeNull();
    expect(screen.queryByTestId('build-path-upgrade')).toBeNull();
    expect(screen.queryByTestId('view-my-path')).toBeNull();
  });

  it('shows the paths load error, not the build-a-path offer, when the paths fail to load', () => {
    setUser('premium');
    (usePaths as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<AlbertScreen />);
    expect(screen.getByTestId('paths-load-error')).toBeTruthy();
    expect(screen.queryByTestId('build-path-start')).toBeNull();
  });

  // ── Unfinished path exists ───────────────────────────────────────────────

  it('shows View my path and Create a NEW path when an unfinished custom path exists', () => {
    setPaths([unfinishedPath]);
    render(<AlbertScreen />);
    expect(screen.getByTestId('view-my-path')).toBeTruthy();
    expect(screen.getByTestId('create-new-path')).toBeTruthy();
    expect(screen.queryByTestId('build-path-start')).toBeNull();
    expect(screen.queryByTestId('build-another')).toBeNull();
  });

  it('View my path routes to Tracks for a premium user', () => {
    setUser('premium');
    setPaths([unfinishedPath]);
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('view-my-path'));
    expect(mockPush).toHaveBeenCalledWith(TRACKS_ROUTE);
  });

  it('View my path routes to Tracks for a non-premium user', () => {
    setUser('spent');
    setPaths([unfinishedPath]);
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('view-my-path'));
    expect(mockPush).toHaveBeenCalledWith(TRACKS_ROUTE);
  });

  it('Create a NEW path opens a confirmation Alert for a premium user', () => {
    setUser('premium');
    setPaths([unfinishedPath]);
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('create-new-path'));
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][1]).toMatch(/removed/i);
  });

  it('Create a NEW path opens the upgrade modal for a spent free user (no Alert)', () => {
    setUser('spent');
    setPaths([unfinishedPath]);
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('create-new-path'));
    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('premium-modal')).toBeTruthy();
  });

  it('confirming the Alert archives the plan and navigates to /build', () => {
    setUser('premium');
    setPaths([unfinishedPath]);
    mockMutate.mockImplementationOnce((_: unknown, cb: { onSuccess?: () => void }) => {
      cb?.onSuccess?.();
    });
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('create-new-path'));

    pressAlertButton('destructive');

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'plan-1', status: 'archived' }),
      expect.any(Object),
    );
    expect(mockPush).toHaveBeenCalledWith(BUILD_ROUTE);
  });

  it('cancelling the Alert mutates nothing and navigates nowhere', () => {
    setUser('premium');
    setPaths([unfinishedPath]);
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('create-new-path'));

    pressAlertButton('cancel');

    expect(mockMutate).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('a failed archive stays on Albert and shows an error', () => {
    setUser('premium');
    setPaths([unfinishedPath]);
    mockMutate.mockImplementationOnce((_: unknown, cb: { onError?: (err: Error) => void }) => {
      cb?.onError?.(new Error('Something went wrong'));
    });
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('create-new-path'));

    pressAlertButton('destructive');

    expect(mockMutate).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalledWith(BUILD_ROUTE);
    expect(screen.getByTestId('albert-archive-error')).toBeTruthy();
  });

  // ── All custom paths complete ─────────────────────────────────────────────

  it('shows View my path and Build another when all custom paths are complete', () => {
    setPaths([finishedPath]);
    render(<AlbertScreen />);
    expect(screen.getByTestId('view-my-path')).toBeTruthy();
    expect(screen.getByTestId('build-another')).toBeTruthy();
    expect(screen.queryByTestId('create-new-path')).toBeNull();
    expect(screen.queryByTestId('build-path-start')).toBeNull();
  });

  it('View my path routes to Tracks in the all-complete state', () => {
    setPaths([finishedPath]);
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('view-my-path'));
    expect(mockPush).toHaveBeenCalledWith(TRACKS_ROUTE);
  });

  it('Build another routes straight to the builder for a premium user (no confirmation)', () => {
    setUser('premium');
    setPaths([finishedPath]);
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('build-another'));
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith(BUILD_ROUTE);
  });

  it('Build another opens the upgrade modal for a spent free user', () => {
    setUser('spent');
    setPaths([finishedPath]);
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('build-another'));
    expect(mockMutate).not.toHaveBeenCalled();
    expect(screen.getByTestId('premium-modal')).toBeTruthy();
  });

  it('the unfinished branch takes priority when user has both finished and unfinished paths', () => {
    setPaths([finishedPath, unfinishedPath]);
    render(<AlbertScreen />);
    expect(screen.getByTestId('create-new-path')).toBeTruthy();
    expect(screen.queryByTestId('build-another')).toBeNull();
  });
});
