import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { colors, font } from '@/theme';
import { StreakCalendar } from '../StreakCalendar';

describe('StreakCalendar', () => {
  const count = () => StyleSheet.flatten(screen.getByTestId('streak-calendar-count').props.style);
  const box = () => StyleSheet.flatten(screen.getByTestId('streak-calendar').props.style);

  it('shows the count and names the streak for screen readers', () => {
    render(<StreakCalendar streak={12} />);
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByLabelText('12-day streak')).toBeTruthy();
  });

  it('draws the count in blue, in the display face', () => {
    render(<StreakCalendar streak={12} />);
    expect(count().color).toBe(colors.brand);
    expect(count().fontFamily).toBe(font.display);
  });

  it('is square at the size given', () => {
    render(<StreakCalendar streak={3} size={40} />);
    expect(box()).toMatchObject({ width: 40, height: 40 });
  });

  it('keeps its shape at a smaller size: the count scales with the calendar', () => {
    const { rerender } = render(<StreakCalendar streak={3} size={56} />);
    const large = count().fontSize as number;
    rerender(<StreakCalendar streak={3} size={40} />);
    expect((count().fontSize as number) / 40).toBeCloseTo(large / 56);
  });
});
