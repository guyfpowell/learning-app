import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AchievementsSection } from '../AchievementsSection';
import { useAchievements } from '@/hooks/useAchievements';

jest.mock('@/hooks/useAchievements', () => ({ useAchievements: jest.fn() }));

const mockAchievementsResponse = {
  unlocked: [
    { key: 'first-light', name: 'First Light', description: 'Completed your first lesson', axis: 'milestone', unlockedAt: '2026-08-01T00:00:00Z' },
    { key: 'signed-on',   name: 'Signed On',   description: 'Chose your first track',       axis: 'milestone', unlockedAt: '2026-08-01T00:00:00Z' },
  ],
  locked: [
    { key: 'good-innings', name: 'Good Innings', description: 'Completed 8 lessons in one sitting', axis: 'session' },
    { key: 'clean-sheet',  name: 'Clean Sheet',  description: 'Got 10 quizzes right first time',    axis: 'accuracy' },
  ],
  totalUnlocked: 2,
  totalAvailable: 30,
};

describe('AchievementsSection', () => {
  beforeEach(() => {
    (useAchievements as jest.Mock).mockReturnValue({ data: mockAchievementsResponse, isLoading: false });
  });

  it('shows how many are earned out of all of them (096)', () => {
    render(<AchievementsSection />);
    expect(screen.getByTestId('achievements-count')).toHaveTextContent('2 of 4');
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
    expect(screen.getByText('First Light')).toBeTruthy();
    expect(screen.getByText('Signed On')).toBeTruthy();
  });

  it('renders locked achievement names', () => {
    render(<AchievementsSection />);
    expect(screen.getByText('Good Innings')).toBeTruthy();
    expect(screen.getByText('Clean Sheet')).toBeTruthy();
  });

  it('unlocked achievement cards have full opacity', () => {
    render(<AchievementsSection />);
    const card = screen.getByTestId('achievement-first-light');
    expect(card.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ opacity: 1 }),
    ]));
  });

  it('locked achievement cards have reduced opacity', () => {
    render(<AchievementsSection />);
    const card = screen.getByTestId('achievement-good-innings');
    expect(card.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ opacity: 0.45 }),
    ]));
  });

  // ── Achievement detail modal ─────────────────────────────────────────────────

  it('tapping an earned achievement opens the detail modal', () => {
    render(<AchievementsSection />);
    fireEvent.press(screen.getByTestId('achievement-first-light'));
    expect(screen.getByTestId('achievement-detail-modal')).toBeTruthy();
  });

  it('detail modal shows the achievement name', () => {
    render(<AchievementsSection />);
    fireEvent.press(screen.getByTestId('achievement-first-light'));
    expect(screen.getByTestId('achievement-detail-name')).toBeTruthy();
  });

  it('detail modal shows the achievement description', () => {
    render(<AchievementsSection />);
    fireEvent.press(screen.getByTestId('achievement-first-light'));
    expect(screen.getByTestId('achievement-detail-description')).toBeTruthy();
    expect(screen.getByText('Completed your first lesson')).toBeTruthy();
  });

  it('earned achievement shows the unlocked date in the modal', () => {
    render(<AchievementsSection />);
    fireEvent.press(screen.getByTestId('achievement-first-light'));
    expect(screen.getByTestId('achievement-detail-earned-date')).toBeTruthy();
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
    fireEvent.press(screen.getByTestId('achievement-first-light'));
    expect(screen.getByTestId('achievement-detail-modal')).toBeTruthy();
    fireEvent.press(screen.getByTestId('achievement-detail-close'));
    expect(screen.queryByTestId('achievement-detail-modal')).toBeNull();
  });
});
