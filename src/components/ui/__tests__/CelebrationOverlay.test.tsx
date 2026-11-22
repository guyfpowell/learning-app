import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { metresChipCopy } from '@learning/shared';
import { colors } from '@/theme';
import { MetresChipOverlay, METRES_CHIP_DISMISS_HINT, chipFlight } from '../CelebrationOverlay';

jest.useFakeTimers();

describe('MetresChipOverlay', () => {
  const baseProps = {
    visible: true,
    copy: metresChipCopy(50, null),
    onDismiss: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders the chip copy when visible', () => {
    render(<MetresChipOverlay {...baseProps} />);
    expect(screen.getByTestId('metres-chip-text')).toBeTruthy();
    expect(screen.getByText(metresChipCopy(50, null))).toBeTruthy();
  });

  it('sits on the given anchor box, centred, instead of the default spot', () => {
    render(<MetresChipOverlay {...baseProps} anchor={{ top: 52, height: 44 }} />);
    expect(StyleSheet.flatten(screen.getByTestId('metres-chip-overlay').props.style)).toMatchObject({
      top: 52,
      height: 44,
      justifyContent: 'center',
    });
  });

  it('does not render when visible is false', () => {
    render(<MetresChipOverlay {...baseProps} visible={false} />);
    expect(screen.queryByTestId('metres-chip-animated')).toBeNull();
  });

  it('says what a tap does as a hint, with no label of its own', () => {
    render(<MetresChipOverlay {...baseProps} />);
    const chip = screen.getByTestId('metres-chip-overlay');
    expect(chip.props.accessibilityHint).toBe(METRES_CHIP_DISMISS_HINT);
    expect(chip.props.accessibilityLabel).toBeUndefined();
  });

  it('calls onDismiss when tapped', () => {
    render(<MetresChipOverlay {...baseProps} />);
    fireEvent.press(screen.getByTestId('metres-chip-overlay'));
    act(() => jest.runAllTimers());
    expect(baseProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after autoDismissMs', () => {
    render(<MetresChipOverlay {...baseProps} autoDismissMs={2000} />);
    act(() => jest.advanceTimersByTime(2000));
    act(() => jest.runAllTimers());
    expect(baseProps.onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('chipFlight', () => {
  const anchor = { top: 50, height: 44 }; // the chip's centre is at y 72
  it('goes from the middle of the chip to the middle of the score', () => {
    const f = chipFlight({ anchor, returnTo: { x: 300, y: 200, width: 60, height: 24 }, chipWidth: 90, windowWidth: 400 });
    expect(f.dx).toBe(300 + 30 - 200); // the score's centre x, less the middle of the screen
    expect(f.dy).toBe(200 + 12 - 72);
  });

  it('shrinks the chip to the score\'s width', () => {
    const f = chipFlight({ anchor, returnTo: { x: 0, y: 0, width: 45, height: 24 }, chipWidth: 90, windowWidth: 400 });
    expect(f.endScale).toBe(0.5);
  });

  it('never shrinks the chip to nothing on the way', () => {
    const f = chipFlight({ anchor, returnTo: { x: 0, y: 0, width: 1, height: 1 }, chipWidth: 90, windowWidth: 400 });
    expect(f.endScale).toBeGreaterThan(0);
    expect(f.endScale).toBeGreaterThanOrEqual(0.3);
  });
});

describe('MetresChipOverlay returning to the score', () => {
  const props = { visible: true, copy: metresChipCopy(50, null), onDismiss: jest.fn(), anchor: { top: 50, height: 44 }, returnTo: { x: 300, y: 200, width: 60, height: 24 } };

  beforeEach(() => jest.clearAllMocks());

  it('flies back onto the score when tapped, then dismisses', () => {
    render(<MetresChipOverlay {...props} />);
    fireEvent(screen.getByTestId('metres-chip-animated'), 'layout', { nativeEvent: { layout: { width: 90, height: 28, x: 0, y: 0 } } });
    fireEvent.press(screen.getByTestId('metres-chip-overlay'));
    expect(props.onDismiss).not.toHaveBeenCalled();
    act(() => jest.runAllTimers());
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('still dismisses when the score has not been found, fading where it stands', () => {
    render(<MetresChipOverlay {...props} returnTo={null} />);
    fireEvent.press(screen.getByTestId('metres-chip-overlay'));
    act(() => jest.runAllTimers());
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('collapses onto the score when it goes by itself after the delay, not only when tapped', () => {
    const timing = jest.spyOn(Animated, 'timing').mockImplementation(() => ({
      start: (done) => done?.({ finished: true }),
      stop: jest.fn(),
      reset: jest.fn(),
    }));
    render(<MetresChipOverlay {...props} autoDismissMs={2000} />);
    // The chip and the score are measured after the first render, which is when the timer was set.
    fireEvent(screen.getByTestId('metres-chip-animated'), 'layout', { nativeEvent: { layout: { width: 90, height: 28, x: 0, y: 0 } } });
    act(() => jest.advanceTimersByTime(2000));
    const leave = timing.mock.calls.map(([, config]) => config).find((config) => config.toValue === 1);
    expect(leave).toMatchObject({ toValue: 1, duration: 480 });
    expect(timing.mock.calls.map(([, config]) => config.duration)).not.toContain(200);
    timing.mockRestore();
  });
});
