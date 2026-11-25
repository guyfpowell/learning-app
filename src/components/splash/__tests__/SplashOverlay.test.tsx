import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { SplashOverlay } from '../SplashOverlay';
import { DEFAULT_SPLASH, SPLASH_MS, SPLASH_VARIANTS, nextSplash } from '../splashSteps';
import { useSplashStore } from '@/store/splash.store';

const WHOLE = SPLASH_MS.hold + SPLASH_MS.fadeOut;
/** The store as a launch finds it. */
const AT_LAUNCH = useSplashStore.getState();

describe('SplashOverlay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useSplashStore.setState(AT_LAUNCH, true);
  });
  afterEach(() => jest.useRealTimers());

  it('shows the square splash on launch for the hold and the fade, then goes', () => {
    render(<SplashOverlay />);
    expect(screen.getByTestId('splash-mark-square')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(WHOLE - 1); });
    expect(screen.getByTestId('ascent-splash')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(1); });
    expect(screen.queryByTestId('ascent-splash')).toBeNull();
  });

  it.each(SPLASH_VARIANTS)('replays with the %s animation when the switch asks', (variant) => {
    render(<SplashOverlay />);
    act(() => { jest.advanceTimersByTime(WHOLE); });
    act(() => useSplashStore.getState().replay(variant));
    expect(screen.getByTestId(`splash-mark-${variant}`)).toBeTruthy();
    act(() => { jest.advanceTimersByTime(WHOLE); });
    expect(screen.queryByTestId('ascent-splash')).toBeNull();
  });

  it('switches from the default to the other animation and back', () => {
    expect(nextSplash(DEFAULT_SPLASH)).toBe('chevrons');
    expect(nextSplash(nextSplash(DEFAULT_SPLASH))).toBe(DEFAULT_SPLASH);
  });
});
