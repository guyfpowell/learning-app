import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { TrackLevelProgress } from '@learning/shared';
import { PathCard } from '../PathCard';
import { makeTrackPath } from '@/test-utils/paths';

const beginner: TrackLevelProgress = {
  level: 'beginner',
  levelLabel: null,
  levelNum: 1,
  completedLessons: 30,
  totalLessons: 100,
  percentComplete: 30,
};

function renderCard() {
  const path = makeTrackPath({ id: 'skill-1', isActive: true, levels: [beginner], completedLessons: 30, totalLessons: 100, percentComplete: 30 });
  render(<PathCard path={path} onStartLesson={jest.fn()} onSkip={jest.fn()} />);
}

describe('PathCard progress card text', () => {
  it('shows the level status, the motivation line and the lessons count', () => {
    renderCard();
    expect(screen.getByText('Beginner in progress')).toBeTruthy();
    expect(screen.getByText("You're 30% through Product Strategy. Keep going!")).toBeTruthy();
    expect(screen.getByText('30 of 100 lessons complete')).toBeTruthy();
  });
});

describe('PathCard opening the track', () => {
  const path = makeTrackPath({ id: 'skill-1', name: 'Product Strategy' });

  it('opens the path when the progress card is pressed', () => {
    const onOpen = jest.fn();
    render(<PathCard path={path} onStartLesson={jest.fn()} onSkip={jest.fn()} onOpen={onOpen} />);
    fireEvent.press(screen.getByLabelText('Open Product Strategy'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('is not pressable when the caller gives nothing to open', () => {
    render(<PathCard path={path} onStartLesson={jest.fn()} onSkip={jest.fn()} />);
    expect(screen.queryByLabelText('Open Product Strategy')).toBeNull();
  });
});
