import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AlbertScreen from '../albert';
import { useSkills, usePaths } from '@/hooks/useTrack';
import { useUpdateTrackPlan } from '@/hooks/useTrackBuilder';
import type { SkillWithAccess, UserPath } from '@learning/shared';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/hooks/useTrack', () => ({
  useSkills: jest.fn(),
  usePaths: jest.fn(),
}));

jest.mock('@/hooks/useTrackBuilder', () => ({
  useUpdateTrackPlan: jest.fn(),
}));

let capturedEdges: string[] | undefined;
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, edges }: { children: React.ReactNode; edges?: string[] }) => {
    capturedEdges = edges;
    return <>{children}</>;
  },
}));

// ── Fixtures ────────────────────────────────────────────────────────────────

const freeSkill = {
  id: 'skill-1',
  premiumStatus: 'free',
  userHasAccess: true,
} as unknown as SkillWithAccess;

const premiumLocked = {
  id: 'skill-2',
  premiumStatus: 'premium',
  userHasAccess: false,
} as unknown as SkillWithAccess;

const premiumOpen = { ...premiumLocked, userHasAccess: true } as SkillWithAccess;

const unfinishedPath = {
  id: 'plan-1',
  kind: 'custom',
  name: 'My AI Path',
  percentComplete: 40,
  isActive: true,
} as unknown as UserPath;

const finishedPath = {
  id: 'plan-2',
  kind: 'custom',
  name: 'Completed Path',
  percentComplete: 100,
  isActive: false,
} as unknown as UserPath;

const trackPath = {
  id: 'skill-3',
  kind: 'track',
  name: 'Some Track',
  percentComplete: 50,
  isActive: false,
} as unknown as UserPath;

// ── Helpers ──────────────────────────────────────────────────────────────────

function setSkills(skills: SkillWithAccess[] | undefined, isLoading = false) {
  (useSkills as jest.Mock).mockReturnValue({ data: skills, isLoading });
}

function setPaths(paths: UserPath[] | undefined, isLoading = false) {
  (usePaths as jest.Mock).mockReturnValue({ data: paths, isLoading });
}

const mockMutate = jest.fn();
const mockUpdatePlan = { mutate: mockMutate, isError: false, error: null };

function setUpdatePlan(overrides: Partial<typeof mockUpdatePlan> = {}) {
  (useUpdateTrackPlan as jest.Mock).mockReturnValue({ ...mockUpdatePlan, ...overrides });
}

// ── Suite ────────────────────────────────────────────────────────────────────

describe('AlbertScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedEdges = undefined;
    setSkills([freeSkill, premiumLocked]);
    setPaths([]);
    setUpdatePlan();
  });

  // ── Existing behaviour (no custom paths) ────────────────────────────────

  it('shows the Meet Albert heading and intro copy', () => {
    render(<AlbertScreen />);
    expect(screen.getByText('Meet Albert')).toBeTruthy();
    expect(screen.getByTestId('albert-intro')).toBeTruthy();
  });

  it('offers Start to a user with access to a premium track (no paths)', () => {
    setSkills([freeSkill, premiumOpen]);
    render(<AlbertScreen />);
    expect(screen.getByTestId('build-path-start')).toBeTruthy();
    expect(screen.queryByTestId('build-path-upgrade')).toBeNull();
  });

  it('routes a premium user to the builder when no paths exist', () => {
    setSkills([freeSkill, premiumOpen]);
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('build-path-start'));
    expect(mockPush).toHaveBeenCalledWith('/build');
  });

  it('offers an upgrade to a free user instead of hiding the card', () => {
    render(<AlbertScreen />);
    expect(screen.getByTestId('build-path-card')).toBeTruthy();
    expect(screen.getByTestId('build-path-upgrade')).toBeTruthy();
    expect(screen.queryByTestId('build-path-start')).toBeNull();
  });

  it('never routes a free user into the builder; opens the upgrade modal', () => {
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('build-path-upgrade'));
    expect(mockPush).not.toHaveBeenCalledWith('/build');
    expect(screen.getByTestId('premium-modal')).toBeTruthy();
  });

  it('Upgrade now in the modal navigates to the paywall (073b-5)', () => {
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('build-path-upgrade'));
    fireEvent.press(screen.getByTestId('upgrade-now-btn'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/paywall');
  });

  it('does not crash while skills are still loading', () => {
    setSkills(undefined, true);
    expect(() => render(<AlbertScreen />)).not.toThrow();
  });

  it('uses edges=[left,right,bottom] so the tab layout owns the top inset', () => {
    render(<AlbertScreen />);
    expect(capturedEdges).toEqual(['left', 'right', 'bottom']);
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
    setSkills([freeSkill, premiumOpen]);
    setPaths(undefined, true);
    render(<AlbertScreen />);
    expect(screen.queryByTestId('build-path-start')).toBeNull();
    expect(screen.queryByTestId('build-path-upgrade')).toBeNull();
    expect(screen.queryByTestId('view-my-path')).toBeNull();
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

  it('View my path routes to Tracks regardless of premium status', () => {
    setPaths([unfinishedPath]);
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('view-my-path'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/tracks');
  });

  it('View my path routes to Tracks for a non-premium user', () => {
    setSkills([freeSkill, premiumLocked]); // non-premium
    setPaths([unfinishedPath]);
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('view-my-path'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/tracks');
  });

  it('Create a NEW path opens a confirmation Alert for a premium user', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    setSkills([freeSkill, premiumOpen]);
    setPaths([unfinishedPath]);
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('create-new-path'));
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][1]).toMatch(/removed/i);
  });

  it('Create a NEW path opens the upgrade modal for a free user (no Alert)', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    setSkills([freeSkill, premiumLocked]);
    setPaths([unfinishedPath]);
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('create-new-path'));
    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('premium-modal')).toBeTruthy();
  });

  it('confirming the Alert archives the plan and navigates to /build', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    setSkills([freeSkill, premiumOpen]);
    setPaths([unfinishedPath]);
    // Mock mutate to call onSuccess immediately
    mockMutate.mockImplementationOnce((_: unknown, cb: { onSuccess?: () => void }) => {
      cb?.onSuccess?.();
    });
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('create-new-path'));

    // Simulate pressing the destructive button in the Alert
    const alertCall = alertSpy.mock.calls[0];
    const buttons = alertCall[2] as { text: string; onPress?: () => void; style?: string }[];
    const confirmButton = buttons.find(b => b.style === 'destructive');
    confirmButton?.onPress?.();

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'plan-1', status: 'archived' }),
        expect.any(Object),
      );
      expect(mockPush).toHaveBeenCalledWith('/build');
    });
  });

  it('cancelling the Alert mutates nothing and navigates nowhere', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    setSkills([freeSkill, premiumOpen]);
    setPaths([unfinishedPath]);
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('create-new-path'));

    const alertCall = alertSpy.mock.calls[0];
    const buttons = alertCall[2] as { text: string; onPress?: () => void; style?: string }[];
    const cancelButton = buttons.find(b => b.style === 'cancel');
    cancelButton?.onPress?.();

    expect(mockMutate).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('a failed archive stays on Albert and shows an error', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    setSkills([freeSkill, premiumOpen]);
    setPaths([unfinishedPath]);
    mockMutate.mockImplementationOnce((_: unknown, cb: { onError?: (err: Error) => void }) => {
      cb?.onError?.(new Error('Something went wrong'));
    });
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('create-new-path'));

    const alertCall = alertSpy.mock.calls[0];
    const buttons = alertCall[2] as { text: string; onPress?: () => void; style?: string }[];
    const confirmButton = buttons.find(b => b.style === 'destructive');
    confirmButton?.onPress?.();

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalledWith('/build');
      expect(screen.getByTestId('albert-archive-error')).toBeTruthy();
    });
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
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/tracks');
  });

  it('Build another routes straight to the builder for a premium user (no confirmation)', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    setSkills([freeSkill, premiumOpen]);
    setPaths([finishedPath]);
    render(<AlbertScreen />);
    fireEvent.press(screen.getByTestId('build-another'));
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/build');
  });

  it('Build another opens the upgrade modal for a free user', () => {
    setSkills([freeSkill, premiumLocked]);
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
