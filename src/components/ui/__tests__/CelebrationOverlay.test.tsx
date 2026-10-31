import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { colors } from '@/theme';
import { CelebrationOverlay, XpChipOverlay, xpFlight } from '../CelebrationOverlay';

jest.useFakeTimers();

describe('CelebrationOverlay', () => {
  const baseProps = {
    visible: true,
    title: 'Achievement Earned!',
    name: 'First Light',
    description: 'Completed your first lesson',
    onDismiss: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders title, name, and description when visible', () => {
    render(<CelebrationOverlay {...baseProps} />);
    expect(screen.getByTestId('celebration-title')).toBeTruthy();
    expect(screen.getByTestId('celebration-name')).toBeTruthy();
    expect(screen.getByTestId('celebration-description')).toBeTruthy();
    expect(screen.getByText('Achievement Earned!')).toBeTruthy();
    expect(screen.getByText('First Light')).toBeTruthy();
    expect(screen.getByText('Completed your first lesson')).toBeTruthy();
  });

  it('does not render when visible is false', () => {
    render(<CelebrationOverlay {...baseProps} visible={false} />);
    expect(screen.queryByTestId('celebration-card')).toBeNull();
  });

  it('calls onDismiss when backdrop is pressed', () => {
    render(<CelebrationOverlay {...baseProps} />);
    fireEvent.press(screen.getByTestId('celebration-backdrop'));
    act(() => jest.runAllTimers());
    expect(baseProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('is a frosted-glass card: a blur under a translucent cobalt wash, white text, coral dismiss button (096)', () => {
    render(<CelebrationOverlay {...baseProps} />);
    const flat = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style);
    expect(screen.getByTestId('celebration-blur')).toBeTruthy();
    expect(flat('celebration-wash').backgroundColor).toBe(colors.brand);
    expect(flat('celebration-wash').opacity).toBeLessThan(1);
    expect(flat('celebration-card').backgroundColor).toBeUndefined();
    expect(flat('celebration-name').color).toBe(colors.onBrand);
    expect(flat('celebration-dismiss').backgroundColor).toBe(colors.coral);
  });

  it('calls onDismiss when the dismiss button is pressed', () => {
    render(<CelebrationOverlay {...baseProps} />);
    fireEvent.press(screen.getByTestId('celebration-dismiss'));
    act(() => jest.runAllTimers());
    expect(baseProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after autoDismissMs', () => {
    render(<CelebrationOverlay {...baseProps} autoDismissMs={3000} />);
    act(() => jest.advanceTimersByTime(3000));
    act(() => jest.runAllTimers());
    expect(baseProps.onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('XpChipOverlay', () => {
  const baseProps = {
    visible: true,
    xp: 50,
    onDismiss: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders the XP amount when visible', () => {
    render(<XpChipOverlay {...baseProps} />);
    expect(screen.getByTestId('xp-chip-text')).toBeTruthy();
    expect(screen.getByText('+50 XP')).toBeTruthy();
  });

  it('sits on the given anchor box, centred, instead of the default spot', () => {
    render(<XpChipOverlay {...baseProps} anchor={{ top: 52, height: 44 }} />);
    expect(StyleSheet.flatten(screen.getByTestId('xp-chip-overlay').props.style)).toMatchObject({
      top: 52,
      height: 44,
      justifyContent: 'center',
    });
  });

  it('does not render when visible is false', () => {
    render(<XpChipOverlay {...baseProps} visible={false} />);
    expect(screen.queryByTestId('xp-chip-animated')).toBeNull();
  });

  it('calls onDismiss when tapped', () => {
    render(<XpChipOverlay {...baseProps} />);
    fireEvent.press(screen.getByTestId('xp-chip-overlay'));
    act(() => jest.runAllTimers());
    expect(baseProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after autoDismissMs', () => {
    render(<XpChipOverlay {...baseProps} autoDismissMs={2000} />);
    act(() => jest.advanceTimersByTime(2000));
    act(() => jest.runAllTimers());
    expect(baseProps.onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('xpFlight', () => {
  const anchor = { top: 50, height: 44 }; // the chip's centre is at y 72
  it('goes from the middle of the chip to the middle of the score', () => {
    const f = xpFlight({ anchor, returnTo: { x: 300, y: 200, width: 60, height: 24 }, chipWidth: 90, windowWidth: 400 });
    expect(f.dx).toBe(300 + 30 - 200); // the score's centre x, less the middle of the screen
    expect(f.dy).toBe(200 + 12 - 72);
  });

  it('shrinks the chip to the score\'s width', () => {
    const f = xpFlight({ anchor, returnTo: { x: 0, y: 0, width: 45, height: 24 }, chipWidth: 90, windowWidth: 400 });
    expect(f.endScale).toBe(0.5);
  });

  it('never shrinks the chip to nothing on the way', () => {
    const f = xpFlight({ anchor, returnTo: { x: 0, y: 0, width: 1, height: 1 }, chipWidth: 90, windowWidth: 400 });
    expect(f.endScale).toBeGreaterThan(0);
    expect(f.endScale).toBeGreaterThanOrEqual(0.3);
  });
});

describe('XpChipOverlay returning to the score', () => {
  const props = { visible: true, xp: 50, onDismiss: jest.fn(), anchor: { top: 50, height: 44 }, returnTo: { x: 300, y: 200, width: 60, height: 24 } };

  beforeEach(() => jest.clearAllMocks());

  it('flies back onto the score when tapped, then dismisses', () => {
    render(<XpChipOverlay {...props} />);
    fireEvent(screen.getByTestId('xp-chip-animated'), 'layout', { nativeEvent: { layout: { width: 90, height: 28, x: 0, y: 0 } } });
    fireEvent.press(screen.getByTestId('xp-chip-overlay'));
    expect(props.onDismiss).not.toHaveBeenCalled();
    act(() => jest.runAllTimers());
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('still dismisses when the score has not been found, fading where it stands', () => {
    render(<XpChipOverlay {...props} returnTo={null} />);
    fireEvent.press(screen.getByTestId('xp-chip-overlay'));
    act(() => jest.runAllTimers());
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('collapses onto the score when it goes by itself after the delay, not only when tapped', () => {
    const timing = jest.spyOn(Animated, 'timing').mockImplementation(() => ({
      start: (done) => done?.({ finished: true }),
      stop: jest.fn(),
      reset: jest.fn(),
    }));
    render(<XpChipOverlay {...props} autoDismissMs={2000} />);
    // The chip and the score are measured after the first render, which is when the timer was set.
    fireEvent(screen.getByTestId('xp-chip-animated'), 'layout', { nativeEvent: { layout: { width: 90, height: 28, x: 0, y: 0 } } });
    act(() => jest.advanceTimersByTime(2000));
    const leave = timing.mock.calls.map(([, config]) => config).find((config) => config.toValue === 1);
    expect(leave).toMatchObject({ toValue: 1, duration: 480 });
    expect(timing.mock.calls.map(([, config]) => config.duration)).not.toContain(200);
    timing.mockRestore();
  });
});
