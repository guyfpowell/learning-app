import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { medal } from '@/theme';
import { AchievementUnlock, unlockLook } from '../AchievementUnlock';

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('AchievementUnlock', () => {
  it('shows the name, what earned it, and its category and tier', () => {
    render(<AchievementUnlock achievement="clean-sheet" onContinue={jest.fn()} />);
    expect(screen.getByText('ACHIEVEMENT UNLOCKED')).toBeTruthy();
    expect(screen.getByTestId('achievement-unlock-name').props.children).toBe('Clean Sheet');
    expect(screen.getByTestId('achievement-unlock-description')).toBeTruthy();
    expect(screen.getByText(/^ACCURACY · /)).toBeTruthy();
  });

  it('calls onContinue from Continue', () => {
    const onContinue = jest.fn();
    render(<AchievementUnlock achievement="first-light" onContinue={onContinue} />);
    fireEvent.press(screen.getByTestId('achievement-continue-btn'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('washes the screen in the category\'s jewel colour', () => {
    expect(unlockLook('Accuracy').bg).toBe(medal.jewel.accuracy);
    expect(unlockLook('Session').bg).toBe(medal.jewel.session);
  });

  it('goes gold with ink text and an ink button for an XP milestone', () => {
    const look = unlockLook('XP milestones');
    expect(look.bg).toBe(medal.gold);
    expect(look.button.face).not.toBe('#FFFFFF');
    expect(look.statusBar).toBe('dark');
  });
});
