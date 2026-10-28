import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TrackMap } from '../TrackMap';
import type { TrackLevelProgress } from '@learning/shared';

const baseLevel: TrackLevelProgress = {
  level: 'beginner',
  levelLabel: null,
  levelNum: 1,
  completedLessons: 2,
  totalLessons: 5,
  percentComplete: 40,
};

describe('TrackMap', () => {
  it('shows levelLabel when set', () => {
    render(<TrackMap levels={[{ ...baseLevel, levelLabel: 'Breaking into product' }]} />);
    expect(screen.getByText('Breaking into product')).toBeTruthy();
  });

  it('falls back to capitalized level name when levelLabel is null', () => {
    render(<TrackMap levels={[baseLevel]} />);
    expect(screen.getByText('Beginner')).toBeTruthy();
  });

  it('091d: shows "<Level> in progress" by default and hides it when showStatus is off', () => {
    const { unmount } = render(<TrackMap levels={[baseLevel]} />);
    expect(screen.getByText('Beginner in progress')).toBeTruthy();
    unmount();
    render(<TrackMap levels={[baseLevel]} showStatus={false} />);
    expect(screen.queryByText('Beginner in progress')).toBeNull();
    expect(screen.getByText('Beginner')).toBeTruthy();
  });

  it('returns null when levels is empty', () => {
    const { toJSON } = render(<TrackMap levels={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('highlights active level and shows progress', () => {
    const levels: TrackLevelProgress[] = [
      baseLevel,
      { ...baseLevel, level: 'intermediate', levelNum: 2, completedLessons: 0 },
    ];
    render(<TrackMap levels={levels} />);
    expect(screen.getAllByTestId('track-map-level')).toHaveLength(2);
  });
});
