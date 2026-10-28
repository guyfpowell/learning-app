import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { colors } from '@/theme';
import { LessonPathHeader, type LessonPathHeaderProps } from '../LessonPathHeader';

const FULL: LessonPathHeaderProps = {
  level: 'beginner',
  levelLabel: 'Beginner',
  topicName: 'Topic One',
  lessonIndex: 2,
  totalLessons: 5,
  path: { name: 'Product Management', percentComplete: 40 },
};

function setup(props: LessonPathHeaderProps) {
  return render(<LessonPathHeader {...props} />);
}

describe('LessonPathHeader', () => {
  it('shows every piece', () => {
    setup(FULL);
    expect(screen.getByTestId('track-header')).toBeTruthy();
    expect(screen.getByText('BEGINNER')).toBeTruthy();
    expect(screen.getByText('Topic One')).toBeTruthy();
    expect(screen.getByText('Lesson 2 of 5')).toBeTruthy();
    expect(screen.getByText('Product Management')).toBeTruthy();
    expect(screen.getByText('40% complete')).toBeTruthy();
  });

  it('the Progress bar is N of M', () => {
    setup(FULL);
    const fill = screen.getByTestId('lesson-position-progress').children[0];
    expect(StyleSheet.flatten(typeof fill === 'string' ? undefined : fill.props.style).width).toBe('40%');
  });

  it('the topic is a muted caps eyebrow, not link-blue', () => {
    setup(FULL);
    const style = StyleSheet.flatten(screen.getByText('Topic One').props.style);
    expect(style).toEqual(expect.objectContaining({ color: colors.textMuted, textTransform: 'uppercase' }));
  });

  it('the path name and percentage are quiet muted text', () => {
    setup(FULL);
    expect(StyleSheet.flatten(screen.getByText('Product Management').props.style).color).toBe(colors.textMuted);
    expect(StyleSheet.flatten(screen.getByText('40% complete').props.style).color).toBe(colors.textMuted);
  });

  it('renders nothing when there is no data', () => {
    setup({});
    expect(screen.queryByTestId('track-header')).toBeNull();
  });

  it('leaves out the position and bar when there is no topic', () => {
    setup({ level: 'beginner', lessonIndex: 2, totalLessons: 5 });
    expect(screen.getByTestId('track-header')).toBeTruthy();
    expect(screen.queryByText('Lesson 2 of 5')).toBeNull();
    expect(screen.queryByTestId('lesson-position-progress')).toBeNull();
  });

  it('leaves out the path row when there is no enrolment', () => {
    setup({ ...FULL, path: undefined });
    expect(screen.queryByText('Product Management')).toBeNull();
    expect(screen.queryByText(/complete/)).toBeNull();
  });
});
