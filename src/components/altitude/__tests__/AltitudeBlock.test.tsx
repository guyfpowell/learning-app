import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { AltitudeResponse } from '@learning/shared';
import { AltitudeBlock } from '../AltitudeBlock';

function altitudeAt(level: number, overrides: Partial<AltitudeResponse> = {}): AltitudeResponse {
  return {
    metres: 4_000,
    level,
    nextLevel: { level: level + 1, startsAt: 4_300, metresToGo: 300 },
    lessonsToNextLevel: 9 - (level - 12),
    nextLandmark: null,
    newLandmark: null,
    ...overrides,
  };
}

function renderBlock(screenName: 'home' | 'progress', altitude: AltitudeResponse) {
  render(<AltitudeBlock screen={screenName} altitude={altitude} trailing={null} onPress={jest.fn()} />);
}

describe('AltitudeBlock on Home', () => {
  it('shows the zone, the first-level chevrons and the zone caption at level 12', () => {
    renderBlock('home', altitudeAt(12));
    expect(screen.getByText('Low Alps')).toBeTruthy();
    expect(screen.getByText('About 9 lessons to Low Alps 2')).toBeTruthy();
    expect(screen.getByTestId('level-chevrons', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('Level 12')).toBeNull();
  });

  it('shows the same zone with both chevrons at level 13', () => {
    renderBlock('home', altitudeAt(13, { lessonsToNextLevel: 8, nextLevel: { level: 14, startsAt: 4_300, metresToGo: 300 } }));
    expect(screen.getByText('Low Alps')).toBeTruthy();
    expect(screen.getByText('About 8 lessons to Alps 1')).toBeTruthy();
    expect(screen.getByTestId('level-chevrons', { includeHiddenElements: true })).toBeTruthy();
  });

  it('shows "Scottish Highlands" with no chevrons at level 11', () => {
    renderBlock('home', altitudeAt(11, { lessonsToNextLevel: 7, nextLevel: { level: 12, startsAt: 4_300, metresToGo: 300 } }));
    expect(screen.getByText('Scottish Highlands')).toBeTruthy();
    expect(screen.getByText('About 7 lessons to Low Alps 1')).toBeTruthy();
    expect(screen.queryByTestId('level-chevrons', { includeHiddenElements: true })).toBeNull();
  });

  it('shows no caption at level 30', () => {
    renderBlock('home', altitudeAt(30, { nextLevel: null, lessonsToNextLevel: null }));
    expect(screen.queryByTestId('altitude-caption')).toBeNull();
  });

  it('keeps a long zone name on one line that shrinks to fit', () => {
    renderBlock('home', altitudeAt(25));
    const title = screen.getByText('Upper Stratosphere');
    expect(title.props.numberOfLines).toBe(1);
    expect(title.props.adjustsFontSizeToFit).toBe(true);
  });
});

describe('AltitudeBlock on Progress', () => {
  it('shows the exact level and its caption, with no chevrons', () => {
    renderBlock('progress', altitudeAt(12));
    expect(screen.getByText('Level 12')).toBeTruthy();
    expect(screen.getByText('About 9 lessons to Level 13')).toBeTruthy();
    expect(screen.queryByTestId('level-chevrons', { includeHiddenElements: true })).toBeNull();
  });
});
