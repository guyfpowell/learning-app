import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ACHIEVEMENTS_BY_KEY, ACHIEVEMENT_UNLOCKED_EYEBROW, celebrationEyebrow, medalArtOf } from '@learning/shared';
import { medalJewelOf } from '@/lib/medalJewel';
import { makeRewardUnlock } from '@/test-utils/achievements';
import { must } from '@/test-utils/must';
import { colors, medal } from '@/theme';
import { AchievementUnlock, unlockLook } from '../AchievementUnlock';

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('AchievementUnlock', () => {
  it('shows the eyebrow, the category alone in the middle row, the name and what earned it', () => {
    const unlock = makeRewardUnlock('clean-sheet');
    render(<AchievementUnlock unlock={unlock} onContinue={jest.fn()} />);
    expect(screen.getByText(ACHIEVEMENT_UNLOCKED_EYEBROW)).toBeTruthy();
    expect(screen.getByTestId('achievement-unlock-category').props.children).toBe(celebrationEyebrow(ACHIEVEMENTS_BY_KEY['clean-sheet']));
    expect(screen.getByTestId('achievement-unlock-name').props.children).toBe(unlock.name);
    expect(screen.getByTestId('achievement-unlock-description').props.children).toBe(unlock.description);
  });

  it('has no Share button', () => {
    render(<AchievementUnlock unlock={makeRewardUnlock('clean-sheet')} onContinue={jest.fn()} />);
    expect(screen.queryByText(/share/i)).toBeNull();
    expect(screen.queryByTestId('achievement-share-btn')).toBeNull();
  });

  it('calls onContinue from Continue', () => {
    const onContinue = jest.fn();
    render(<AchievementUnlock unlock={makeRewardUnlock('first-light')} onContinue={onContinue} />);
    fireEvent.press(screen.getByTestId('achievement-continue-btn'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('washes the screen in the medal\'s jewel colour', () => {
    expect(unlockLook(medalJewelOf(ACHIEVEMENTS_BY_KEY['clean-sheet'])).bg).toBe(must(medalArtOf('clean-sheet'), 'clean-sheet').jewel);
    expect(unlockLook(medalJewelOf(ACHIEVEMENTS_BY_KEY['off-peak'])).bg).toBe(must(medalArtOf('off-peak'), 'off-peak').jewel);
  });

  it('shows a Trailhead step\'s name with no medal and no tag', () => {
    render(<AchievementUnlock unlock={makeRewardUnlock('first-light')} onContinue={jest.fn()} />);
    expect(screen.getByTestId('achievement-unlock-name').props.children).toBe('Finish a lesson');
    expect(screen.queryByTestId('medal-first-light')).toBeNull();
    expect(screen.queryByTestId('achievement-unlock-tag')).toBeNull();
  });

  it('shows a landmark on its own screen, and a medal on the medal screen', () => {
    const { rerender } = render(<AchievementUnlock unlock={makeRewardUnlock('big-ben')} onContinue={jest.fn()} />);
    expect(screen.getByTestId('landmark-unlock')).toBeTruthy();
    expect(screen.queryByTestId('achievement-unlock')).toBeNull();
    rerender(<AchievementUnlock unlock={makeRewardUnlock('clean-sheet')} onContinue={jest.fn()} />);
    expect(screen.getByTestId('achievement-unlock')).toBeTruthy();
    expect(screen.queryByTestId('landmark-unlock')).toBeNull();
  });

  it('keeps the white text and white button on every medal', () => {
    const look = unlockLook(medal.cobalt);
    expect(look.text).toBe(colors.white);
    expect(look.button.face).toBe(colors.white);
    expect(look.statusBar).toBe('light');
  });
});
