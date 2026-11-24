import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { LANDMARK_EYEBROW, CELEBRATION_CONTINUE, landmarkByKey, landmarkLookOf, metresLabel, type LandmarkKey } from '@learning/shared';
import { makeRewardUnlock } from '@/test-utils/achievements';
import { must } from '@/test-utils/must';
import { LANDMARK_COLOURS, LandmarkUnlock } from '../LandmarkUnlock';

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

function renderLandmark(key: LandmarkKey, onContinue = jest.fn()) {
  render(<LandmarkUnlock unlock={makeRewardUnlock(key)} onContinue={onContinue} entrance={null} />);
}

function landmarkOf(key: LandmarkKey) {
  return must(landmarkByKey(key), key);
}

describe('LandmarkUnlock', () => {
  it('shows Big Ben: the eyebrow, its height, its name and its line, on the UK-hills background', () => {
    renderLandmark('big-ben');
    const big = landmarkOf('big-ben');
    expect(screen.getByTestId('landmark-unlock-eyebrow').props.children).toBe(LANDMARK_EYEBROW);
    expect(screen.getByTestId('landmark-unlock-height').props.children).toBe(metresLabel(big.height));
    expect(screen.getByTestId('landmark-unlock-name').props.children).toBe(big.name);
    expect(screen.getByTestId('landmark-unlock-line').props.children).toBe(big.line);
    expect(screen.getByTestId('medal-big-ben')).toBeTruthy();
    expect(screen.getByTestId('landmark-background-uk-hills')).toBeTruthy();
    expect(screen.queryByTestId('landmark-earth')).toBeNull();
  });

  it('shows Everest: its height and the Everest background', () => {
    renderLandmark('everest');
    expect(screen.getByTestId('landmark-unlock-height').props.children).toBe(metresLabel(landmarkOf('everest').height));
    expect(screen.getByTestId('landmark-background-everest')).toBeTruthy();
    expect(screen.queryByTestId('landmark-earth')).toBeNull();
  });

  it('shows the Kármán line on the edge-of-space background with the Earth\'s curve', () => {
    renderLandmark('karman-line');
    expect(screen.getByTestId('landmark-unlock-height').props.children).toBe(metresLabel(landmarkOf('karman-line').height));
    expect(screen.getByTestId('landmark-background-space')).toBeTruthy();
    expect(screen.getByTestId('landmark-earth')).toBeTruthy();
  });

  it('draws no Earth on the other edge-of-space landmarks', () => {
    renderLandmark('orbit');
    expect(screen.getByTestId('landmark-background-space')).toBeTruthy();
    expect(screen.queryByTestId('landmark-earth')).toBeNull();
  });

  it('has no Share button', () => {
    renderLandmark('everest');
    expect(screen.queryByText(/share/i)).toBeNull();
    expect(screen.queryByTestId('achievement-share-btn')).toBeNull();
  });

  it('calls onContinue from Continue', () => {
    const onContinue = jest.fn();
    renderLandmark('big-ben', onContinue);
    expect(screen.getByText(CELEBRATION_CONTINUE)).toBeTruthy();
    fireEvent.press(screen.getByTestId('achievement-continue-btn'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

describe('LANDMARK_COLOURS', () => {
  it('keeps dark text on the light backgrounds and white text on cobalt and navy', () => {
    const barOf = (key: LandmarkKey) => LANDMARK_COLOURS[landmarkLookOf(landmarkOf(key))].statusBar;
    expect(barOf('big-ben')).toBe('dark');
    expect(barOf('everest')).toBe('dark');
    expect(barOf('mont-blanc')).toBe('dark');
    expect(barOf('cruising-altitude')).toBe('light');
    expect(barOf('karman-line')).toBe('light');
  });
});
