import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { CelebrationOverlay, XpChipOverlay } from '../CelebrationOverlay';

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
