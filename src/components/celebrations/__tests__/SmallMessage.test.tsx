import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SMALL_MESSAGE_MS, TRAILHEAD_STEP_KEYS, smallMessageCountOf, smallMessageLine, smallMessageOf } from '@learning/shared';
import { makeRewardUnlock } from '@/test-utils/achievements';
import { SmallMessage, SWIPE_UP_DISTANCE } from '../SmallMessage';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const medal = makeRewardUnlock('hat-trick', { celebration: 'toast' });
const FIFTH = TRAILHEAD_STEP_KEYS[4];
const step = makeRewardUnlock(FIFTH, { celebration: 'toast', stepsDone: 5 });

const TWO_WAITING = smallMessageCountOf([medal, makeRewardUnlock('off-peak', { celebration: 'toast' })]);

function renderMessage(unlock = medal, count: string | null = null) {
  const onDone = jest.fn();
  const onOpen = jest.fn();
  render(<SmallMessage unlock={unlock} count={count} onDone={onDone} onOpen={onOpen} />);
  return { onDone, onOpen };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('SmallMessage', () => {
  it('shows a medal with its name and line, and finishes after SMALL_MESSAGE_MS', () => {
    const { onDone } = renderMessage();
    expect(screen.getByTestId('small-message-line').props.children).toBe(smallMessageLine(medal));
    expect(screen.getByTestId(`medal-${medal.key}`)).toBeTruthy();
    act(() => { jest.advanceTimersByTime(SMALL_MESSAGE_MS - 1); });
    expect(onDone).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(1); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('opens the medal when tapped', () => {
    const { onOpen, onDone } = renderMessage();
    fireEvent.press(screen.getByTestId('small-message'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('finishes when swiped up, and not for a short or downward drag', () => {
    const { onDone } = renderMessage();
    const swipe = screen.getByTestId('small-message-swipe');
    fireEvent(swipe, 'touchStart', { nativeEvent: { pageY: 100 } });
    fireEvent(swipe, 'touchEnd', { nativeEvent: { pageY: 90 } });
    fireEvent(swipe, 'touchStart', { nativeEvent: { pageY: 100 } });
    fireEvent(swipe, 'touchEnd', { nativeEvent: { pageY: 160 } });
    expect(onDone).not.toHaveBeenCalled();
    fireEvent(swipe, 'touchStart', { nativeEvent: { pageY: 100 } });
    fireEvent(swipe, 'touchEnd', { nativeEvent: { pageY: 100 - SWIPE_UP_DISTANCE } });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('shows a Trailhead step as "Trailhead 5/7 · Saved a lesson" with its step icon and no medal', () => {
    renderMessage(step);
    expect(screen.getByTestId('small-message-line').props.children).toBe(smallMessageOf(step));
    expect(screen.getByTestId('small-message-step-icon')).toBeTruthy();
    expect(screen.queryByTestId(`medal-${step.key}`)).toBeNull();
  });

  it('shows "1 of 2" and a peeking edge when another waits', () => {
    renderMessage(medal, TWO_WAITING);
    expect(screen.getByTestId('small-message-count').props.children).toBe(TWO_WAITING);
    expect(screen.getByTestId('small-message-peek')).toBeTruthy();
  });

  it('shows no count and no peeking edge alone', () => {
    renderMessage();
    expect(screen.queryByTestId('small-message-count')).toBeNull();
    expect(screen.queryByTestId('small-message-peek')).toBeNull();
  });
});
