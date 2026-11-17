import { AppState } from 'react-native';
import { renderHook, waitFor } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import type { TrackContents } from '@learning/shared';
import { queryWrapper } from '@/test-utils/queryClient';
import { createStaleTimeTestQueryClient } from '@/test-utils/appQueryClient';
import { makeCustomPath, makeTrackPath } from '@/test-utils/paths';
import { usePrefetchNextScreens } from '../usePrefetchNextScreens';
import { useTrackContents } from '../useTrack';
import { useProposal } from '../useProposal';
import { proposalQueryKey, trackContentsQueryKey } from '@/lib/queryKeys';
import { trackService } from '@/services/track.service';
import { proposalService } from '@/services/proposal.service';

// A focus effect is an ordinary effect here: the hook is mounted, so the screen is focused.
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]) };
});
jest.mock('@/services/track.service', () => ({ trackService: { getTrackContents: jest.fn() } }));
jest.mock('@/services/proposal.service', () => ({ proposalService: { getProposal: jest.fn() } }));

const mockContents = trackService.getTrackContents as jest.Mock;
const mockProposal = proposalService.getProposal as jest.Mock;

const trackPath = makeTrackPath({ id: 'skill-1' });
const customPath = makeCustomPath({ id: 'plan-1', hasProposal: true });
const quietCustomPath = makeCustomPath({ id: 'plan-2', hasProposal: false });

function contentsOf(kind: TrackContents['kind'], id: string): TrackContents {
  return { kind, id, name: `Path ${id}`, groups: [], enrolled: true };
}

function setAppState(state: 'active' | 'background') {
  Object.defineProperty(AppState, 'currentState', { value: state, configurable: true });
}

describe('usePrefetchNextScreens (115f)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAppState('active');
    onlineManager.setOnline(true);
    mockContents.mockImplementation((kind: TrackContents['kind'], id: string) => Promise.resolve(contentsOf(kind, id)));
    mockProposal.mockResolvedValue(null);
  });
  afterEach(() => onlineManager.setOnline(true));

  it.each(['tracks', 'progress'] as const)('%s: loads the contents of every enrolled path, of both kinds, into the track screen\'s cache entry', async (screen) => {
    const client = createStaleTimeTestQueryClient();
    renderHook(() => usePrefetchNextScreens(screen, [trackPath, customPath]), { wrapper: queryWrapper(client) });
    await waitFor(() => expect(client.getQueryData(trackContentsQueryKey('custom', 'plan-1'))).toEqual(contentsOf('custom', 'plan-1')));
    expect(client.getQueryData(trackContentsQueryKey('track', 'skill-1'))).toEqual(contentsOf('track', 'skill-1'));
    expect(mockProposal).not.toHaveBeenCalled();
  });

  it('albert: loads the custom path\'s contents and its proposal, and no track', async () => {
    const client = createStaleTimeTestQueryClient();
    renderHook(() => usePrefetchNextScreens('albert', [trackPath, customPath]), { wrapper: queryWrapper(client) });
    await waitFor(() => expect(client.getQueryState(proposalQueryKey('plan-1'))?.status).toBe('success'));
    expect(client.getQueryData(trackContentsQueryKey('custom', 'plan-1'))).toEqual(contentsOf('custom', 'plan-1'));
    expect(mockContents).not.toHaveBeenCalledWith('track', 'skill-1');
  });

  it('albert: asks for a proposal only on a path that has one', async () => {
    const client = createStaleTimeTestQueryClient();
    renderHook(() => usePrefetchNextScreens('albert', [quietCustomPath]), { wrapper: queryWrapper(client) });
    await waitFor(() => expect(client.getQueryData(trackContentsQueryKey('custom', 'plan-2'))).toBeDefined());
    expect(mockProposal).not.toHaveBeenCalled();
  });

  it('asks for the paths one after another, not all at once', async () => {
    const client = createStaleTimeTestQueryClient();
    const inFlight = { now: 0, most: 0 };
    mockContents.mockImplementation(async (kind: TrackContents['kind'], id: string) => {
      inFlight.now += 1;
      inFlight.most = Math.max(inFlight.most, inFlight.now);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight.now -= 1;
      return contentsOf(kind, id);
    });
    renderHook(() => usePrefetchNextScreens('tracks', [trackPath, customPath, quietCustomPath]), { wrapper: queryWrapper(client) });
    await waitFor(() => expect(client.getQueryData(trackContentsQueryKey('custom', 'plan-2'))).toBeDefined());
    expect(mockContents).toHaveBeenCalledTimes(3);
    expect(inFlight.most).toBe(1);
  });

  it('does not ask again for contents that are already fresh', async () => {
    const client = createStaleTimeTestQueryClient();
    client.setQueryData(trackContentsQueryKey('track', 'skill-1'), contentsOf('track', 'skill-1'));
    renderHook(() => usePrefetchNextScreens('tracks', [trackPath, customPath]), { wrapper: queryWrapper(client) });
    await waitFor(() => expect(client.getQueryData(trackContentsQueryKey('custom', 'plan-1'))).toBeDefined());
    expect(mockContents).toHaveBeenCalledTimes(1);
    expect(mockContents).toHaveBeenCalledWith('custom', 'plan-1');
  });

  it('shares one cache entry with the track screen: opening it needs no second request', async () => {
    const client = createStaleTimeTestQueryClient();
    renderHook(() => usePrefetchNextScreens('tracks', [trackPath]), { wrapper: queryWrapper(client) });
    await waitFor(() => expect(client.getQueryData(trackContentsQueryKey('track', 'skill-1'))).toBeDefined());
    const screen = renderHook(() => useTrackContents('track', 'skill-1', true), { wrapper: queryWrapper(client) });
    expect(screen.result.current.isLoading).toBe(false);
    expect(screen.result.current.data).toEqual(contentsOf('track', 'skill-1'));
    expect(mockContents).toHaveBeenCalledTimes(1);
  });

  it('shares one cache entry with the Albert proposal section', async () => {
    const client = createStaleTimeTestQueryClient();
    renderHook(() => usePrefetchNextScreens('albert', [customPath]), { wrapper: queryWrapper(client) });
    await waitFor(() => expect(client.getQueryState(proposalQueryKey('plan-1'))?.status).toBe('success'));
    const section = renderHook(() => useProposal('plan-1', true), { wrapper: queryWrapper(client) });
    expect(section.result.current.isLoading).toBe(false);
    expect(mockProposal).toHaveBeenCalledTimes(1);
  });

  it('shows nothing on a failed prefetch, goes on to the next path, and the screen loads it as today', async () => {
    const client = createStaleTimeTestQueryClient();
    let failing = true;
    mockContents.mockImplementation((kind: TrackContents['kind'], id: string) =>
      (failing && id === 'skill-1' ? Promise.reject(new Error('offline')) : Promise.resolve(contentsOf(kind, id))));
    renderHook(() => usePrefetchNextScreens('tracks', [trackPath, customPath]), { wrapper: queryWrapper(client) });
    await waitFor(() => expect(client.getQueryData(trackContentsQueryKey('custom', 'plan-1'))).toBeDefined());
    expect(client.getQueryState(trackContentsQueryKey('track', 'skill-1'))?.status).toBe('error');
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ message: 'Track contents load failed' }));
    failing = false;
    const screen = renderHook(() => useTrackContents('track', 'skill-1', true), { wrapper: queryWrapper(client) });
    await waitFor(() => expect(screen.result.current.data).toEqual(contentsOf('track', 'skill-1')));
  });

  it('asks for nothing before the paths have loaded', () => {
    renderHook(() => usePrefetchNextScreens('tracks', undefined), { wrapper: queryWrapper(createStaleTimeTestQueryClient()) });
    expect(mockContents).not.toHaveBeenCalled();
  });

  it('asks for nothing while offline', () => {
    onlineManager.setOnline(false);
    renderHook(() => usePrefetchNextScreens('tracks', [trackPath]), { wrapper: queryWrapper(createStaleTimeTestQueryClient()) });
    expect(mockContents).not.toHaveBeenCalled();
  });

  it('asks for nothing while the app is in the background', () => {
    setAppState('background');
    renderHook(() => usePrefetchNextScreens('tracks', [trackPath]), { wrapper: queryWrapper(createStaleTimeTestQueryClient()) });
    expect(mockContents).not.toHaveBeenCalled();
  });

  it('stops asking for the rest once the screen loses focus', async () => {
    const client = createStaleTimeTestQueryClient();
    mockContents.mockImplementation(async (kind: TrackContents['kind'], id: string) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return contentsOf(kind, id);
    });
    const { unmount } = renderHook(() => usePrefetchNextScreens('tracks', [trackPath, customPath]), { wrapper: queryWrapper(client) });
    unmount();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(mockContents).toHaveBeenCalledTimes(1);
  });
});
