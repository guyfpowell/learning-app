import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ACHIEVEMENTS_BY_KEY, CELEBRATION_CONTINUE, JUST_EARNED, MEDAL_SHEET_CLOSE, celebrationEyebrow, medalEarnedCopy } from '@learning/shared';
import { makeRewardUnlock } from '@/test-utils/achievements';
import { MedalSheet, celebrationItemOf } from '../MedalSheet';

const CLEAN_SHEET = ACHIEVEMENTS_BY_KEY['clean-sheet'];
const earnedItem = {
  key: CLEAN_SHEET.key,
  definition: CLEAN_SHEET,
  earned: true,
  name: CLEAN_SHEET.name,
  description: CLEAN_SHEET.description,
  unlockedAt: '2026-08-01T12:00:00Z',
};

describe('MedalSheet', () => {
  describe('opened as a celebration', () => {
    const unlock = makeRewardUnlock('clean-sheet', { celebration: 'sheet' });

    it('shows Just earned in place of the earned date, and Continue in place of Close', () => {
      render(<MedalSheet item={celebrationItemOf(unlock)} celebrating onClose={jest.fn()} />);
      expect(screen.getByTestId('achievement-detail-just-earned').props.children).toBe(JUST_EARNED);
      expect(screen.queryByTestId('achievement-detail-earned-date')).toBeNull();
      expect(screen.getByText(CELEBRATION_CONTINUE)).toBeTruthy();
      expect(screen.queryByText(MEDAL_SHEET_CLOSE)).toBeNull();
    });

    it('shows the category alone as its eyebrow, with no tier word', () => {
      render(<MedalSheet item={celebrationItemOf(unlock)} celebrating onClose={jest.fn()} />);
      expect(screen.getByTestId('achievement-detail-eyebrow').props.children).toBe(celebrationEyebrow(CLEAN_SHEET));
    });

    it('shows the name and description the server sent', () => {
      render(<MedalSheet item={celebrationItemOf(unlock)} celebrating onClose={jest.fn()} />);
      expect(screen.getByTestId('achievement-detail-name').props.children).toBe(unlock.name);
      expect(screen.getByTestId('achievement-detail-description').props.children).toBe(unlock.description);
    });

    it('calls onClose from Continue', () => {
      const onClose = jest.fn();
      render(<MedalSheet item={celebrationItemOf(unlock)} celebrating onClose={onClose} />);
      fireEvent.press(screen.getByTestId('achievement-detail-close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows a Trailhead step with its name and no eyebrow', () => {
      const step = makeRewardUnlock('first-light', { celebration: 'sheet' });
      render(<MedalSheet item={celebrationItemOf(step)} celebrating onClose={jest.fn()} />);
      expect(screen.getByTestId('achievement-detail-name').props.children).toBe(step.name);
      expect(screen.queryByTestId('achievement-detail-eyebrow')).toBeNull();
    });
  });

  describe('opened from the grid', () => {
    it('still shows the earned date and Close', () => {
      render(<MedalSheet item={earnedItem} celebrating={false} onClose={jest.fn()} />);
      expect(screen.getByTestId('achievement-detail-earned-date')).toHaveTextContent(medalEarnedCopy('2026-08-01T12:00:00Z'));
      expect(screen.getByText(MEDAL_SHEET_CLOSE)).toBeTruthy();
      expect(screen.queryByTestId('achievement-detail-just-earned')).toBeNull();
      expect(screen.queryByText(CELEBRATION_CONTINUE)).toBeNull();
    });

    it('shows the category alone as its eyebrow', () => {
      render(<MedalSheet item={earnedItem} celebrating={false} onClose={jest.fn()} />);
      expect(screen.getByTestId('achievement-detail-eyebrow').props.children).toBe(celebrationEyebrow(CLEAN_SHEET));
    });

    it('shows how to earn a locked medal and that it is not earned yet', () => {
      render(<MedalSheet item={{ ...earnedItem, earned: false, unlockedAt: null }} celebrating={false} onClose={jest.fn()} />);
      expect(screen.getByText('HOW TO EARN IT')).toBeTruthy();
      expect(screen.getByText('Not earned yet')).toBeTruthy();
    });
  });
});
