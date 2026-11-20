import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Sentry from '@sentry/react-native';
import { focusManager } from '@tanstack/react-query';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';
import { makeRewardUnlock } from '@/test-utils/achievements';
import { achievementService } from '@/services/achievement.service';
import { registerSafeWrites } from '@/lib/safeWrites';
import { useAuthStore } from '@/store/auth.store';
import { useCelebrationQueueStore } from '@/store/celebrationQueue.store';
import { UNSEEN_ACHIEVEMENTS_QUERY_KEY } from '@/lib/queryKeys';
import { clearSessionData } from '@/lib/offlineWrites';
import { CelebrationQueue } from '../CelebrationQueue';
import { ACHIEVEMENTS_BY_KEY, CELEBRATION_CONTINUE, JUST_EARNED, SMALL_MESSAGE_MS, TRAILHEAD_STEP_KEYS, celebrationEyebrow, smallMessageCountOf, smallMessageLine, smallMessageOf, type UnseenAchievement } from '@learning/shared';
import { SWIPE_UP_DISTANCE } from '@/components/celebrations/SmallMessage';

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/services/achievement.service', () => ({
  achievementService: { getUnseen: jest.fn(), markSeen: jest.fn() },
}));

const medal: UnseenAchievement = { ...makeRewardUnlock('clean-sheet'), unlockedAt: '2026-11-19T10:00:00.000Z' };
const step: UnseenAchievement = { ...makeRewardUnlock('first-light'), unlockedAt: '2026-11-19T10:01:00.000Z' };

// What the server holds: the mocks answer from this, so a test changes the server, not the call order.
let serverUnseen: UnseenAchievement[] = [];
let unseenDown = false;
let seenDown = false;
const seenSent: string[] = [];

function renderQueue() {
  const client = createTestQueryClient();
  registerSafeWrites(client);
  render(<CelebrationQueue />, { wrapper: queryWrapper(client) });
  return client;
}

beforeEach(() => {
  serverUnseen = [];
  unseenDown = false;
  seenDown = false;
  seenSent.length = 0;
  useCelebrationQueueStore.getState().clear();
  useAuthStore.setState({ accessToken: 'token' });
  (achievementService.getUnseen as jest.Mock).mockImplementation(() =>
    unseenDown ? Promise.reject(new Error('offline')) : Promise.resolve({ unseen: serverUnseen }));
  (achievementService.markSeen as jest.Mock).mockImplementation((key: string) => {
    seenSent.push(key);
    return seenDown ? Promise.reject(new Error('down')) : Promise.resolve();
  });
});

describe('CelebrationQueue', () => {
  it('reads the unseen list on start and shows the first unlock', async () => {
    serverUnseen = [medal, step];
    renderQueue();
    expect((await screen.findByTestId('achievement-unlock-name')).props.children).toBe(medal.name);
  });

  it('reads the unseen list again when the app returns to the foreground', async () => {
    renderQueue();
    await waitFor(() => expect(achievementService.getUnseen).toHaveBeenCalled());
    serverUnseen = [step];
    act(() => { focusManager.setFocused(false); focusManager.setFocused(true); });
    expect((await screen.findByTestId('achievement-unlock-name')).props.children).toBe(step.name);
  });

  it('shows a Trailhead step with its name and no medal', async () => {
    serverUnseen = [step];
    renderQueue();
    expect((await screen.findByTestId('achievement-unlock-name')).props.children).toBe(step.name);
    expect(screen.queryByTestId('achievement-unlock-tag')).toBeNull();
  });

  it('sends seen for the dismissed key and shows the next unlock', async () => {
    serverUnseen = [medal, step];
    renderQueue();
    await screen.findByTestId('achievement-continue-btn');
    fireEvent.press(screen.getByTestId('achievement-continue-btn'));
    await waitFor(() => expect(seenSent).toEqual([medal.key]));
    expect((await screen.findByTestId('achievement-unlock-name')).props.children).toBe(step.name);
  });

  it('does not bring a dismissed unlock back when its seen write fails, and logs the failure', async () => {
    seenDown = true;
    serverUnseen = [medal];
    const client = renderQueue();
    fireEvent.press(await screen.findByTestId('achievement-continue-btn'));
    await waitFor(() => expect(seenSent).toEqual([medal.key]));
    await act(async () => { await client.refetchQueries({ queryKey: UNSEEN_ACHIEVEMENTS_QUERY_KEY }); });
    expect(screen.queryByTestId('achievement-unlock')).toBeNull();
    expect(useCelebrationQueueStore.getState().queue).toEqual([]);
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ message: 'Marking an achievement seen failed', data: expect.objectContaining({ key: medal.key }) }));
  });

  it('leaves the queue as it was when the unseen load fails', async () => {
    serverUnseen = [medal];
    const client = renderQueue();
    await screen.findByTestId('achievement-unlock');
    unseenDown = true;
    await act(async () => { await client.refetchQueries({ queryKey: UNSEEN_ACHIEVEMENTS_QUERY_KEY }); });
    expect(useCelebrationQueueStore.getState().queue).toEqual([medal]);
    expect(screen.getByTestId('achievement-unlock')).toBeTruthy();
  });

  it('is emptied by sign-out', async () => {
    serverUnseen = [medal];
    const client = renderQueue();
    await screen.findByTestId('achievement-unlock');
    await act(async () => { useAuthStore.setState({ accessToken: null }); await clearSessionData(client); });
    expect(useCelebrationQueueStore.getState().queue).toEqual([]);
  });

  describe('sheets', () => {
    const sheetMedal: UnseenAchievement = { ...makeRewardUnlock('promoted', { celebration: 'sheet' }), unlockedAt: '2026-11-19T10:00:00.000Z' };

    it('shows a sheet unlock in the bottom sheet with Just earned and Continue, not full screen', async () => {
      serverUnseen = [sheetMedal];
      renderQueue();
      expect((await screen.findByTestId('achievement-detail-just-earned')).props.children).toBe(JUST_EARNED);
      expect(screen.getByTestId('achievement-detail-eyebrow').props.children).toBe(celebrationEyebrow(ACHIEVEMENTS_BY_KEY[sheetMedal.key]));
      expect(screen.getByText(CELEBRATION_CONTINUE)).toBeTruthy();
      expect(screen.queryByTestId('achievement-unlock')).toBeNull();
    });

    it('marks a sheet seen from Continue and shows the next unlock', async () => {
      serverUnseen = [sheetMedal, medal];
      renderQueue();
      fireEvent.press(await screen.findByTestId('achievement-detail-close'));
      await waitFor(() => expect(seenSent).toEqual([sheetMedal.key]));
      expect((await screen.findByTestId('achievement-unlock-name')).props.children).toBe(medal.name);
    });

    it('marks a sheet seen when its scrim is tapped', async () => {
      serverUnseen = [sheetMedal];
      renderQueue();
      fireEvent.press(await screen.findByTestId('achievement-detail-scrim'));
      await waitFor(() => expect(seenSent).toEqual([sheetMedal.key]));
    });
  });

  describe('small messages', () => {
    const toastMedal: UnseenAchievement = { ...makeRewardUnlock('hat-trick', { celebration: 'toast' }), unlockedAt: '2026-11-19T10:00:00.000Z' };
    const toastStep: UnseenAchievement = { ...makeRewardUnlock(TRAILHEAD_STEP_KEYS[4], { celebration: 'toast', stepsDone: 5 }), unlockedAt: '2026-11-19T10:01:00.000Z' };

    it('shows a toast as a small message, not full screen, and marks it seen after SMALL_MESSAGE_MS', async () => {
      serverUnseen = [toastMedal];
      renderQueue();
      jest.useFakeTimers();
      try {
        expect(await screen.findByTestId('small-message-line')).toBeTruthy();
        expect(screen.queryByTestId('achievement-unlock')).toBeNull();
        act(() => { jest.advanceTimersByTime(SMALL_MESSAGE_MS); });
      } finally {
        jest.useRealTimers();
      }
      await waitFor(() => expect(seenSent).toEqual([toastMedal.key]));
      expect(screen.queryByTestId('small-message')).toBeNull();
    });

    it('opens the medal as a sheet when tapped, and marks it seen only once that is dismissed', async () => {
      serverUnseen = [toastMedal];
      renderQueue();
      fireEvent.press(await screen.findByTestId('small-message'));
      expect(screen.queryByTestId('small-message')).toBeNull();
      expect(useCelebrationQueueStore.getState().queue).toEqual([{ ...toastMedal, celebration: 'sheet' }]);
      expect(seenSent).toEqual([]);
    });

    it('shows one of two with "1 of 2", then the next alone', async () => {
      serverUnseen = [toastMedal, toastStep];
      renderQueue();
      expect((await screen.findByTestId('small-message-count')).props.children).toBe(smallMessageCountOf([toastMedal, toastStep]));
      expect(screen.getByTestId('small-message-line').props.children).toBe(smallMessageLine(toastMedal));
      fireEvent(screen.getByTestId('small-message-swipe'), 'touchStart', { nativeEvent: { pageY: 100 } });
      fireEvent(screen.getByTestId('small-message-swipe'), 'touchEnd', { nativeEvent: { pageY: 100 - SWIPE_UP_DISTANCE } });
      await waitFor(() => expect(seenSent).toEqual([toastMedal.key]));
      expect((await screen.findByTestId('small-message-line')).props.children)
        .toBe(smallMessageOf(toastStep));
      expect(screen.queryByTestId('small-message-count')).toBeNull();
    });
  });
});
