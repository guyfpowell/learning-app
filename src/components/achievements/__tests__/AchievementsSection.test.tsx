import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react-native';
import { AchievementsSection } from '../AchievementsSection';
import { useAchievements } from '@/hooks/useAchievements';
import { ACHIEVEMENTS_BY_KEY, SECRET_MEDAL_NAME, celebrationEyebrow, type AchievementsResponse } from '@learning/shared';
import { must } from '@/test-utils/must';

jest.mock('@/hooks/useAchievements', () => ({ useAchievements: jest.fn() }));

const mockAchievementsResponse: AchievementsResponse = {
  unlocked: [
    { key: 'hat-trick', name: 'Hat-Trick', description: 'Completed your first lesson', axis: 'milestone', unlockedAt: '2026-08-01T00:00:00Z' },
    { key: 'promoted', name: 'Promoted', description: 'Finished a beginner level', axis: 'depth', unlockedAt: '2026-08-01T00:00:00Z' },
  ],
  locked: [
    ACHIEVEMENTS_BY_KEY['good-innings'],
    ACHIEVEMENTS_BY_KEY['clean-sheet'],
  ],
  totalUnlocked: 2,
  totalAvailable: 4,
};

describe('AchievementsSection', () => {
  beforeEach(() => {
    (useAchievements as jest.Mock).mockReturnValue({ data: mockAchievementsResponse, isLoading: false });
  });

  it('shows how many are earned out of all of them (096)', () => {
    render(<AchievementsSection />);
    expect(screen.getByTestId('achievements-count')).toHaveTextContent('2 of 4 earned · tap any to see how to earn it');
  });

  it('groups the medals under EARNED and STILL TO EARN', () => {
    render(<AchievementsSection />);
    expect(screen.getByText('EARNED')).toBeTruthy();
    expect(screen.getByText('STILL TO EARN')).toBeTruthy();
  });

  it('handles undefined achievements gracefully', () => {
    (useAchievements as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });
    expect(() => render(<AchievementsSection />)).not.toThrow();
  });

  // ── Achievements grid ───────────────────────────────────────────────────────

  it('shows the Achievements section heading', () => {
    render(<AchievementsSection />);
    expect(screen.getByText('Achievements')).toBeTruthy();
  });

  it('renders unlocked achievement names', () => {
    render(<AchievementsSection />);
    expect(screen.getByText('Hat-Trick')).toBeTruthy();
    expect(screen.getByText('Promoted')).toBeTruthy();
  });

  it('renders locked achievement names', () => {
    render(<AchievementsSection />);
    expect(screen.getByText('Good Innings')).toBeTruthy();
    expect(screen.getByText('Clean Sheet')).toBeTruthy();
  });

  it('draws a medal for each achievement, a locked one for those not earned', () => {
    render(<AchievementsSection />);
    expect(within(screen.getByTestId('achievement-hat-trick')).getByText('Hat-Trick')).toBeTruthy();
    expect(screen.getByTestId('achievement-good-innings')).toBeTruthy();
  });

  // ── Achievement detail modal ─────────────────────────────────────────────────

  it('tapping an earned achievement opens the detail modal', () => {
    render(<AchievementsSection />);
    fireEvent.press(screen.getByTestId('achievement-hat-trick'));
    expect(screen.getByTestId('achievement-detail-modal')).toBeTruthy();
  });

  it('detail modal shows the achievement name', () => {
    render(<AchievementsSection />);
    fireEvent.press(screen.getByTestId('achievement-hat-trick'));
    expect(screen.getByTestId('achievement-detail-name')).toBeTruthy();
  });

  it('detail modal shows the achievement description', () => {
    render(<AchievementsSection />);
    fireEvent.press(screen.getByTestId('achievement-hat-trick'));
    expect(screen.getByTestId('achievement-detail-description')).toBeTruthy();
    expect(screen.getByText('Completed your first lesson')).toBeTruthy();
  });

  it('earned achievement shows the unlocked date in the modal', () => {
    render(<AchievementsSection />);
    fireEvent.press(screen.getByTestId('achievement-hat-trick'));
    expect(screen.getByTestId('achievement-detail-earned-date')).toBeTruthy();
  });

  it('detail modal opened from the grid shows the category alone, the earned date and Close', () => {
    render(<AchievementsSection />);
    fireEvent.press(screen.getByTestId('achievement-hat-trick'));
    expect(screen.getByTestId('achievement-detail-eyebrow').props.children).toBe(celebrationEyebrow(ACHIEVEMENTS_BY_KEY['hat-trick']));
    expect(screen.getByTestId('achievement-detail-earned-date')).toBeTruthy();
    expect(screen.getByText('Close')).toBeTruthy();
    expect(screen.queryByTestId('achievement-detail-just-earned')).toBeNull();
  });

  it('tapping a locked achievement also opens the detail modal', () => {
    render(<AchievementsSection />);
    fireEvent.press(screen.getByTestId('achievement-good-innings'));
    expect(screen.getByTestId('achievement-detail-modal')).toBeTruthy();
  });

  it('locked achievement does not show an earned date', () => {
    render(<AchievementsSection />);
    fireEvent.press(screen.getByTestId('achievement-good-innings'));
    expect(screen.queryByTestId('achievement-detail-earned-date')).toBeNull();
  });

  it('close button dismisses the detail modal', () => {
    render(<AchievementsSection />);
    fireEvent.press(screen.getByTestId('achievement-hat-trick'));
    expect(screen.getByTestId('achievement-detail-modal')).toBeTruthy();
    fireEvent.press(screen.getByTestId('achievement-detail-close'));
    expect(screen.queryByTestId('achievement-detail-modal')).toBeNull();
  });

  // ── Medals only (119ai) ─────────────────────────────────────────────────────

  it('renders only the medals from a fixture holding all three kinds', () => {
    const data: AchievementsResponse = {
        unlocked: [
          { key: 'hat-trick', name: 'Hat-Trick', description: 'd', axis: 'accuracy', unlockedAt: '2026-08-01T00:00:00Z' },
          { key: 'first-light', name: 'Finish a lesson', description: 'd', axis: 'milestone', unlockedAt: '2026-08-01T00:00:00Z' },
          { key: 'ben-nevis', name: 'Ben Nevis', description: 'd', axis: 'landmark', unlockedAt: '2026-08-01T00:00:00Z' },
        ],
        locked: [ACHIEVEMENTS_BY_KEY['good-innings'], ACHIEVEMENTS_BY_KEY['signed-on'], ACHIEVEMENTS_BY_KEY.everest],
        totalUnlocked: 1,
        totalAvailable: 2,
    };
    (useAchievements as jest.Mock).mockReturnValue({ data, isLoading: false });
    render(<AchievementsSection />);
    expect(screen.getByTestId('achievement-hat-trick')).toBeTruthy();
    expect(screen.getByTestId('achievement-good-innings')).toBeTruthy();
    for (const key of ['first-light', 'ben-nevis', 'signed-on', 'everest']) {
      expect(screen.queryByTestId(`achievement-${key}`)).toBeNull();
    }
    expect(screen.getByTestId('achievements-count')).toHaveTextContent('1 of 2 earned · tap any to see how to earn it');
  });

  // ── Secret medals ───────────────────────────────────────────────────────────

  it('shows a locked secret medal as "???" with its hint, in the grid and the sheet', () => {
    const earlyTrain = ACHIEVEMENTS_BY_KEY['early-train'];
    const data: AchievementsResponse = { unlocked: [], locked: [earlyTrain], totalUnlocked: 0, totalAvailable: 1 };
    (useAchievements as jest.Mock).mockReturnValue({ data, isLoading: false });
    render(<AchievementsSection />);
    expect(within(screen.getByTestId('achievement-early-train')).getByText(SECRET_MEDAL_NAME)).toBeTruthy();
    expect(screen.queryByText(earlyTrain.name)).toBeNull();
    fireEvent.press(screen.getByTestId('achievement-early-train'));
    expect(screen.getByTestId('achievement-detail-name')).toHaveTextContent(SECRET_MEDAL_NAME);
    expect(screen.getByTestId('achievement-detail-description')).toHaveTextContent(must(earlyTrain.secret, 'hint').hint);
  });
});
