import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react-native';
import { AchievementsSection } from '../AchievementsSection';
import { RUNG_RAISE, rungStyleOf } from '../LadderRow';
import { useAchievements } from '@/hooks/useAchievements';
import {
  ACHIEVEMENTS_BY_KEY,
  ACHIEVEMENTS_LOAD_ERROR,
  ACHIEVEMENTS_HEADING,
  MEDAL_SHEET_CLOSE,
  SECRET_MEDAL_NAME,
  celebrationEyebrow,
  ladderCountCopy,
  medalEarnedCopy,
  medalsEarnedCopy,
  rungProgressCopy,
  type AchievementsResponse,
} from '@learning/shared';
import { makeLadder, makeLandmarks, makeRung, makeTrailhead } from '@/test-utils/achievements';
import { testIdsInOrder } from '@/test-utils/testIds';
import { must } from '@/test-utils/must';

jest.mock('@/hooks/useAchievements', () => ({ useAchievements: jest.fn() }));

const EARNED_AT = '2026-08-01T12:00:00Z';
const NEXT_PROGRESS = { current: 7, target: 10 };
const OTHER_PROGRESS = { current: 3, target: 8 };

const mockAchievementsResponse: AchievementsResponse = {
  ladders: [
    makeLadder('accuracy', [
      makeRung('hat-trick', { unlockedAt: EARNED_AT }),
      makeRung('clean-sheet', { isNextRung: true, progress: NEXT_PROGRESS }),
    ]),
    makeLadder('session', [
      makeRung('last-orders', { unlockedAt: EARNED_AT }),
      makeRung('early-train', { isNextRung: true }),
      makeRung('good-innings', { progress: OTHER_PROGRESS }),
    ]),
  ],
  trailhead: { steps: [], finished: true },
  totalUnlocked: 9,
  totalAvailable: 39,
  landmarks: makeLandmarks(1_120),
};

describe('AchievementsSection', () => {
  beforeEach(() => {
    (useAchievements as jest.Mock).mockReturnValue({ data: mockAchievementsResponse, isLoading: false });
  });

  it('puts the Trailhead card at the top of the grid while it is unfinished', () => {
    (useAchievements as jest.Mock).mockReturnValue({ data: { ...mockAchievementsResponse, trailhead: makeTrailhead(4) }, isLoading: false });
    render(<AchievementsSection />);
    const ids = testIdsInOrder(screen.toJSON());
    expect(ids.indexOf('trailhead-card')).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf('trailhead-card')).toBeLessThan(ids.indexOf('ladder-accuracy'));
  });

  it('shows no Trailhead card once it is finished', () => {
    render(<AchievementsSection />);
    expect(screen.queryByTestId('trailhead-card')).toBeNull();
  });

  it('shows the Achievements section heading', () => {
    render(<AchievementsSection />);
    expect(screen.getByText(ACHIEVEMENTS_HEADING)).toBeTruthy();
  });

  it('header reads the medals earned out of the server total', () => {
    render(<AchievementsSection />);
    expect(screen.getByTestId('achievements-count').props.children).toBe(medalsEarnedCopy(9, 39));
  });

  it('says a failed load in place of the grid, never an empty grid', () => {
    (useAchievements as jest.Mock).mockReturnValue({ data: mockAchievementsResponse, isLoading: false, isError: true });
    render(<AchievementsSection />);
    expect(screen.getByTestId('achievements-load-error').props.children).toBe(ACHIEVEMENTS_LOAD_ERROR);
    expect(screen.queryByTestId('ladder-accuracy')).toBeNull();
    expect(screen.queryByTestId('achievement-hat-trick')).toBeNull();
  });

  it('handles undefined achievements gracefully', () => {
    (useAchievements as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });
    expect(() => render(<AchievementsSection />)).not.toThrow();
  });

  // ── Ladders ─────────────────────────────────────────────────────────────────

  it('renders the ladders in the server order, each with its category in upper case and its count', () => {
    render(<AchievementsSection />);
    const ladders = screen.getAllByTestId(/^ladder-(?!count|name)/);
    expect(ladders.map(l => l.props.testID)).toEqual(['ladder-accuracy', 'ladder-session']);
    expect(screen.getByTestId('ladder-name-accuracy').props.children).toBe(celebrationEyebrow({ axis: 'accuracy' }));
    expect(screen.getByTestId('ladder-count-accuracy').props.children).toBe(ladderCountCopy(1, 2));
    expect(screen.getByTestId('ladder-name-session').props.children).toBe(celebrationEyebrow({ axis: 'session' }));
    expect(screen.getByTestId('ladder-count-session').props.children).toBe(ladderCountCopy(1, 3));
  });

  it('renders no flat EARNED or STILL TO EARN lists', () => {
    render(<AchievementsSection />);
    expect(screen.queryByText('EARNED')).toBeNull();
    expect(screen.queryByText('STILL TO EARN')).toBeNull();
  });

  it('renders a ladder\'s rungs in the server order', () => {
    render(<AchievementsSection />);
    const rungs = within(screen.getByTestId('ladder-session')).getAllByTestId(/^achievement-/);
    expect(rungs.map(r => r.props.testID)).toEqual(['achievement-last-orders', 'achievement-early-train', 'achievement-good-innings']);
  });

  it('renders only the rungs the ladders hold: no landmark or Trailhead step', () => {
    render(<AchievementsSection />);
    expect(screen.queryByTestId('achievement-ben-nevis')).toBeNull();
    expect(screen.queryByTestId('achievement-signed-on')).toBeNull();
  });

  // ── Rungs ───────────────────────────────────────────────────────────────────

  it('raises the next rung only', () => {
    const next = makeRung('clean-sheet', { isNextRung: true });
    const other = makeRung('good-innings');
    expect(rungStyleOf(next).transform).toEqual([{ translateY: -RUNG_RAISE }]);
    expect(rungStyleOf(other).transform).toBeUndefined();
  });

  it('shows the count on the next rung', () => {
    render(<AchievementsSection />);
    expect(screen.getByTestId('rung-progress-clean-sheet').props.children).toBe(rungProgressCopy(NEXT_PROGRESS.current, NEXT_PROGRESS.target));
  });

  it('shows no count on another locked rung that has progress', () => {
    render(<AchievementsSection />);
    expect(screen.queryByTestId('rung-progress-good-innings')).toBeNull();
    expect(screen.queryByText(rungProgressCopy(OTHER_PROGRESS.current, OTHER_PROGRESS.target))).toBeNull();
  });

  it('shows no count on an earned rung', () => {
    render(<AchievementsSection />);
    expect(screen.queryByTestId('rung-progress-hat-trick')).toBeNull();
  });

  it('shows a locked secret as ??? with its hint, and no count', () => {
    render(<AchievementsSection />);
    const rung = screen.getByTestId('achievement-early-train');
    expect(within(rung).getByText(SECRET_MEDAL_NAME)).toBeTruthy();
    expect(within(rung).getByText(must(ACHIEVEMENTS_BY_KEY['early-train'].secret, 'early-train secret').hint)).toBeTruthy();
    expect(within(rung).queryByText(ACHIEVEMENTS_BY_KEY['early-train'].name)).toBeNull();
  });

  it('shows an earned secret by its name', () => {
    render(<AchievementsSection />);
    const rung = screen.getByTestId('achievement-last-orders');
    expect(within(rung).getByText(ACHIEVEMENTS_BY_KEY['last-orders'].name)).toBeTruthy();
    expect(within(rung).queryByText(SECRET_MEDAL_NAME)).toBeNull();
  });

  it('shows no hint on a locked rung that is not a secret', () => {
    render(<AchievementsSection />);
    expect(screen.queryByTestId('rung-hint-clean-sheet')).toBeNull();
    expect(screen.queryByTestId('rung-hint-hat-trick')).toBeNull();
  });

  // ── The medal sheet, opened from a rung ─────────────────────────────────────

  it('tapping an earned rung opens the sheet with the category alone, name, description, earned date and Close', () => {
    render(<AchievementsSection />);
    fireEvent.press(screen.getByTestId('achievement-hat-trick'));
    expect(screen.getByTestId('achievement-detail-eyebrow').props.children).toBe(celebrationEyebrow(ACHIEVEMENTS_BY_KEY['hat-trick']));
    expect(screen.getByTestId('achievement-detail-name').props.children).toBe(ACHIEVEMENTS_BY_KEY['hat-trick'].name);
    expect(screen.getByTestId('achievement-detail-description').props.children).toBe(ACHIEVEMENTS_BY_KEY['hat-trick'].description);
    expect(screen.getByTestId('achievement-detail-earned-date').props.children).toBe(medalEarnedCopy(EARNED_AT));
    expect(screen.getByText(MEDAL_SHEET_CLOSE)).toBeTruthy();
    expect(screen.queryByTestId('achievement-detail-just-earned')).toBeNull();
  });

  it('tapping a locked rung opens the sheet with how to earn it and no earned date', () => {
    render(<AchievementsSection />);
    fireEvent.press(screen.getByTestId('achievement-clean-sheet'));
    expect(screen.getByTestId('achievement-detail-name').props.children).toBe(ACHIEVEMENTS_BY_KEY['clean-sheet'].name);
    expect(screen.getByTestId('achievement-detail-description').props.children).toBe(ACHIEVEMENTS_BY_KEY['clean-sheet'].description);
    expect(screen.queryByTestId('achievement-detail-earned-date')).toBeNull();
  });

  it('tapping a rung that is not the next one opens the sheet too', () => {
    render(<AchievementsSection />);
    fireEvent.press(screen.getByTestId('achievement-good-innings'));
    expect(screen.getByTestId('achievement-detail-name').props.children).toBe(ACHIEVEMENTS_BY_KEY['good-innings'].name);
  });

  it('tapping a locked secret opens the sheet with ??? and its hint', () => {
    render(<AchievementsSection />);
    fireEvent.press(screen.getByTestId('achievement-early-train'));
    expect(screen.getByTestId('achievement-detail-name').props.children).toBe(SECRET_MEDAL_NAME);
    expect(screen.getByTestId('achievement-detail-description').props.children).toBe(must(ACHIEVEMENTS_BY_KEY['early-train'].secret, 'early-train secret').hint);
  });

  it('close button dismisses the sheet', () => {
    render(<AchievementsSection />);
    fireEvent.press(screen.getByTestId('achievement-hat-trick'));
    expect(screen.getByTestId('achievement-detail-modal')).toBeTruthy();
    fireEvent.press(screen.getByTestId('achievement-detail-close'));
    expect(screen.queryByTestId('achievement-detail-modal')).toBeNull();
  });
});
