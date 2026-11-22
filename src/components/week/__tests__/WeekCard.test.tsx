import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { WEEK_TITLE, metresClimbedCopy } from '@learning/shared';
import { WEEK_ROUTE } from '@/lib/routes';
import { WeekCard } from '@/components/week/WeekCard';
import { useWeek } from '@/hooks/useWeek';
import { makeWeekSummary } from '@/test-utils/achievements';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/hooks/useWeek', () => ({ useWeek: jest.fn() }));

describe('WeekCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the week\'s title and the metres climbed', () => {
    const week = makeWeekSummary({ metresClimbed: 340 });
    (useWeek as jest.Mock).mockReturnValue({ data: week });
    render(<WeekCard />);
    expect(screen.getByText(WEEK_TITLE)).toBeTruthy();
    expect(screen.getByTestId('week-card-metres').props.children).toBe(metresClimbedCopy(340));
  });

  it('shows just the title while the week loads or fails', () => {
    (useWeek as jest.Mock).mockReturnValue({ data: undefined });
    render(<WeekCard />);
    expect(screen.getByText(WEEK_TITLE)).toBeTruthy();
    expect(screen.queryByTestId('week-card-metres')).toBeNull();
  });

  it('opens the week', () => {
    (useWeek as jest.Mock).mockReturnValue({ data: undefined });
    render(<WeekCard />);
    fireEvent.press(screen.getByTestId('week-link'));
    expect(mockPush).toHaveBeenCalledWith(WEEK_ROUTE);
  });
});
