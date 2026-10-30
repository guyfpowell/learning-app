import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { colors, font } from '@/theme';
import { MAX_TICKS, StreakCalendar, calendarTicks } from '../StreakCalendar';

const ticksIn = (d: string) => d.split('M').filter((part) => part.trim().length > 0).length;

describe('calendarTicks', () => {
  it('has no ticks on a zero streak', () => {
    expect(calendarTicks(0)).toBe('');
  });

  it.each([1, 2, 3, 4, 5, 6])('draws %i tick(s) for a %i-day streak', (days) => {
    expect(ticksIn(calendarTicks(days))).toBe(days);
  });

  it('keeps all the ticks, and no more, once the streak passes the grid', () => {
    expect(ticksIn(calendarTicks(7))).toBe(MAX_TICKS);
    expect(ticksIn(calendarTicks(120))).toBe(MAX_TICKS);
  });

  it('adds ticks left to right along the top row first', () => {
    const first = calendarTicks(1);
    const second = calendarTicks(2);
    expect(second.startsWith(first)).toBe(true);
    const ticks = calendarTicks(4).split('M').filter(Boolean);
    const y = (tick: string) => Number(tick.trim().split(/[ ,]/)[1]);
    expect(y(ticks[3] ?? '')).toBeGreaterThan(y(ticks[2] ?? ''));
  });

  it('keeps every tick clear of the page bottom (58 less its 2pt stroke) and the header band (to 27)', () => {
    const ys = calendarTicks(MAX_TICKS)
      .split(/[ML]/)
      .filter((part) => part.trim().length > 0)
      .map((part) => Number(part.trim().split(' ')[1]));
    expect(Math.max(...ys)).toBeLessThanOrEqual(52);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(29);
  });
});

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
