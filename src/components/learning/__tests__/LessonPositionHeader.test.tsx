import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { colors, levelCard } from '@/theme';
import { LessonPositionHeader } from '../LessonPositionHeader';

describe('LessonPositionHeader', () => {
  it('says where the lesson sits, with one segment per lesson', () => {
    render(<LessonPositionHeader index={2} total={8} level="beginner" />);
    expect(screen.getByText('Lesson 2 of 8')).toBeTruthy();
    expect(screen.getByTestId('lesson-position-segments').children).toHaveLength(8);
  });

  it.each(['beginner', 'intermediate', 'advanced', 'expert'] as const)('lights the %s lessons done in the level colour, the current one lighter, and leaves the rest empty', (level) => {
    render(<LessonPositionHeader index={2} total={4} level={level} />);
    const colour = (i: number) => {
      const node = screen.getByTestId('lesson-position-segments').children[i];
      return typeof node === 'string' ? undefined : StyleSheet.flatten(node.props.style).backgroundColor;
    };
    expect(colour(0)).toBe(levelCard[level].base);
    expect(colour(1)).toMatch(new RegExp(`^${levelCard[level].base}`));
    expect(colour(1)).not.toBe(levelCard[level].base);
    expect([colour(2), colour(3)]).toEqual([colors.borderSubtle, colors.borderSubtle]);
  });
});
