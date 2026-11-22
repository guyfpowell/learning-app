import React from 'react';
import { render } from '@testing-library/react-native';
import { Circle } from 'react-native-svg';
import { StreakCalendarIcon } from '@/components/ui/StreakCalendarIcon';

describe('StreakCalendarIcon', () => {
  it('draws a calendar with no number in it', () => {
    const { getByTestId, queryByText } = render(<StreakCalendarIcon size={20} done />);
    expect(getByTestId('streak-calendar-icon', { includeHiddenElements: true })).toBeTruthy();
    expect(queryByText(/\d/)).toBeNull();
  });

  it('draws the tick badge (a cut-out and a ring) once there is a streak, and not before', () => {
    const { UNSAFE_queryAllByType, rerender } = render(<StreakCalendarIcon size={20} done />);
    expect(UNSAFE_queryAllByType(Circle)).toHaveLength(2);
    rerender(<StreakCalendarIcon size={20} done={false} />);
    expect(UNSAFE_queryAllByType(Circle)).toHaveLength(0);
  });
});
