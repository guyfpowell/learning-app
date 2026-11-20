import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import {
  ACHIEVEMENTS_BY_KEY,
  WEEK_DONE,
  WEEK_LOAD_ERROR,
  WEEK_SECTION_HEADING,
  WEEK_TITLE,
  landmarkSheetOf,
  levelsGainedCopy,
  metresClimbedCopy,
  weekLessonsCopy,
  weekSectionsOf,
} from '@learning/shared';
import WeekScreen from '../week';
import { useWeek } from '@/hooks/useWeek';
import { useProfile } from '@/hooks/useProfile';
import { makeDatedUnlock, makeWeekSummary } from '@/test-utils/achievements';
import { testIdsInOrder } from '@/test-utils/testIds';

jest.mock('@/hooks/useWeek', () => ({ useWeek: jest.fn() }));
jest.mock('@/hooks/useProfile', () => ({ useProfile: jest.fn() }));

const mockGoBack = jest.fn();
jest.mock('@/hooks/useGoBack', () => ({ useGoBack: () => mockGoBack }));

const screenOptions: { title?: string } = {};
jest.mock('expo-router', () => ({
  Stack: { Screen: ({ options }: { options: { title?: string } }) => { screenOptions.title = options.title; return null; } },
}));

const TIMEZONE = 'Europe/London';
const LANDMARK_AT = '2026-11-18T09:00:00Z';
const MEDAL_AT = '2026-11-19T09:00:00Z';
const STEP_AT = '2026-11-17T09:00:00Z';

const landmark = makeDatedUnlock('ben-nevis', LANDMARK_AT);
const medal = makeDatedUnlock('hat-trick', MEDAL_AT);
const step = makeDatedUnlock('first-light', STEP_AT, { stepsDone: 2 });

const WEEK = makeWeekSummary({
  metresClimbed: 410,
  levelAtStart: 8,
  levelNow: 10,
  lessonsCompleted: 8,
  metresNow: 1_010,
  unlocked: [step, medal, landmark],
});

/** Each row's line, as shared builds it. */
const LINE_OF = new Map(weekSectionsOf(WEEK.unlocked, TIMEZONE).flatMap(({ rows }) => rows).map((row) => [row.key, row.line]));

const loaded = (data = WEEK) => (useWeek as jest.Mock).mockReturnValue({ data, isError: false });

describe('WeekScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useProfile as jest.Mock).mockReturnValue({ data: { timezone: TIMEZONE } });
    loaded();
  });

  it('is titled "The week"', () => {
    render(<WeekScreen />);
    expect(screenOptions.title).toBe(WEEK_TITLE);
  });

  it('shows the metres climbed, the levels gained and the lessons', () => {
    render(<WeekScreen />);
    expect(screen.getByTestId('week-metres').props.children).toBe(metresClimbedCopy(WEEK.metresClimbed));
    expect(screen.getByTestId('week-levels').props.children).toBe(levelsGainedCopy(WEEK.levelAtStart, WEEK.levelNow));
    expect(screen.getByTestId('week-lessons').props.children).toBe(weekLessonsCopy(WEEK.lessonsCompleted, WEEK.metresNow));
  });

  it('shows the landmarks, then the medals, then the Trailhead, each under its heading with its rows and lines', () => {
    render(<WeekScreen />);
    const ids = testIdsInOrder(screen.toJSON());
    expect(ids.filter((id) => id.startsWith('week-section-'))).toEqual(['week-section-landmarks', 'week-section-medals', 'week-section-trailhead']);
    for (const [section, unlock] of [['landmarks', landmark], ['medals', medal], ['trailhead', step]] as const) {
      const block = screen.getByTestId(`week-section-${section}`);
      expect(within(block).getByText(WEEK_SECTION_HEADING[section])).toBeTruthy();
      expect(within(block).getByText(unlock.name)).toBeTruthy();
      expect(within(block).getByTestId(`week-row-line-${unlock.key}`).props.children).toBe(LINE_OF.get(unlock.key));
    }
  });

  it('draws a Trailhead step with its step icon and a medal as a medal', () => {
    render(<WeekScreen />);
    expect(within(screen.getByTestId(`week-row-${step.key}`)).getByTestId(`trailhead-icon-${step.key}`)).toBeTruthy();
    expect(within(screen.getByTestId(`week-row-${medal.key}`)).getByTestId(`medal-${medal.key}`)).toBeTruthy();
  });

  it('opens the medal sheet from a medal row, with its earned date', () => {
    render(<WeekScreen />);
    fireEvent.press(screen.getByTestId(`week-row-${medal.key}`));
    expect(screen.getByTestId('achievement-detail-name').props.children).toBe(ACHIEVEMENTS_BY_KEY[medal.key].name);
    expect(screen.getByTestId('achievement-detail-earned-date')).toBeTruthy();
  });

  it('opens the medal sheet from a Trailhead step row', () => {
    render(<WeekScreen />);
    fireEvent.press(screen.getByTestId(`week-row-${step.key}`));
    expect(screen.getByTestId('achievement-detail-name').props.children).toBe(step.name);
  });

  it('opens the landmark sheet from a landmark row', () => {
    render(<WeekScreen />);
    fireEvent.press(screen.getByTestId(`week-row-${landmark.key}`));
    const sheet = landmarkSheetOf('ben-nevis', LANDMARK_AT, TIMEZONE);
    expect(screen.getByTestId('landmark-sheet-name').props.children).toBe(sheet.name);
    expect(screen.getByTestId('landmark-sheet-passed-on').props.children).toBe(sheet.passedOn);
  });

  it('closes a sheet with its own button and leaves the screen open', () => {
    render(<WeekScreen />);
    fireEvent.press(screen.getByTestId(`week-row-${medal.key}`));
    fireEvent.press(screen.getByTestId('achievement-detail-close'));
    expect(screen.queryByTestId('achievement-detail-modal')).toBeNull();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('Done closes the screen', () => {
    render(<WeekScreen />);
    fireEvent.press(screen.getByTestId('week-done'));
    expect(within(screen.getByTestId('week-done')).getByText(WEEK_DONE)).toBeTruthy();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows no sections for a quiet week', () => {
    loaded(makeWeekSummary({ metresNow: 120 }));
    render(<WeekScreen />);
    expect(testIdsInOrder(screen.toJSON()).filter((id) => id.startsWith('week-section-'))).toEqual([]);
    expect(screen.getByTestId('week-metres').props.children).toBe(metresClimbedCopy(0));
  });

  it('shows the error when the load fails, even with older data', () => {
    (useWeek as jest.Mock).mockReturnValue({ data: WEEK, isError: true });
    render(<WeekScreen />);
    expect(screen.getByText(WEEK_LOAD_ERROR)).toBeTruthy();
    expect(screen.queryByTestId('week-metres')).toBeNull();
  });
});
