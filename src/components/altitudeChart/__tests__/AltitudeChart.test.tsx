import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  MEDAL_SHEET_CLOSE,
  heightChartLayoutOf,
  heightChartPosition,
  landmarkPassedOnCopy,
  landmarkRowsOf,
  landmarkSheetOf,
  type AchievementsResponse,
  type AltitudeResponse,
} from '@learning/shared';
import { makeAchievementsResponse, makeLandmarks } from '@/test-utils/achievements';
import { must } from '@/test-utils/must';
import { AltitudeChart } from '../AltitudeChart';
import { CHART_HEIGHT, MARKER_SPACING, ROW_SPACING, canvasYOf } from '../chartLayout';
import { SLOT_HEIGHT, railStylesOf } from '../chartStyles';

// A stub that shows whether the medal was drawn locked; Medal.test.tsx covers the drawing.
jest.mock('@/components/ui/Medal', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Medal: ({ definition, locked }: { definition: { key: string }; locked?: boolean }) => (
      <View testID={`medal-${definition.key}`} accessibilityValue={{ text: locked ? 'locked' : 'coloured' }} />
    ),
  };
});

const NOW = new Date('2026-11-20T12:00:00Z');
const METRES = 2_000;
const PASSED_AT = must(makeLandmarks(METRES).find((l) => l.key === 'ben-nevis'), 'ben-nevis').passedAt;

const ALTITUDE: AltitudeResponse = {
  metres: METRES,
  level: 12,
  nextLevel: { level: 13, startsAt: 2_100, metresToGo: 100 },
  lessonsToNextLevel: 4,
  nextLandmark: null,
  newLandmark: null,
};

function renderChart() {
  return render(
    <AltitudeChart altitude={ALTITUDE} achievements={makeAchievementsResponse(METRES)} name="Ada Lovelace" timezone="UTC" now={NOW} />,
  );
}

describe('AltitudeChart landmark sheet', () => {
  it('opens a passed landmark\'s sheet with the eyebrow, name, height line and passed line from landmarkSheetOf', () => {
    renderChart();
    const sheet = landmarkSheetOf('ben-nevis', must(PASSED_AT, 'passedAt'), 'UTC');
    expect(screen.queryByTestId('landmark-sheet')).toBeNull();
    fireEvent.press(screen.getByTestId('landmark-row-ben-nevis'));
    const open = screen.getByTestId('landmark-sheet');
    expect(open).toBeTruthy();
    expect(screen.getByTestId('landmark-sheet-eyebrow').props.children).toBe(sheet.eyebrow);
    expect(screen.getByTestId('landmark-sheet-name').props.children).toBe(sheet.name);
    expect(screen.getByTestId('landmark-sheet-height-line').props.children).toBe(sheet.heightLine);
    expect(screen.getByTestId('landmark-sheet-passed-on').props.children).toBe(landmarkPassedOnCopy(must(PASSED_AT, 'passedAt'), 'UTC'));
    expect(screen.getByTestId('landmark-sheet-medal')).toBeTruthy();
  });

  it('closes with the Close button', () => {
    renderChart();
    fireEvent.press(screen.getByTestId('landmark-row-ben-nevis'));
    fireEvent.press(screen.getByText(MEDAL_SHEET_CLOSE));
    expect(screen.queryByTestId('landmark-sheet')).toBeNull();
  });

  it('opens no sheet from a landmark not yet passed', () => {
    renderChart();
    fireEvent.press(screen.getByTestId('landmark-row-everest'));
    expect(screen.queryByTestId('landmark-sheet')).toBeNull();
  });
});

const C2: AltitudeResponse = {
  metres: 1_120,
  level: 10,
  nextLevel: { level: 11, startsAt: 1_270, metresToGo: 150 },
  lessonsToNextLevel: 5,
  nextLandmark: { key: 'ben-nevis', name: 'Ben Nevis', height: 1_345, metresToGo: 225, lessonsToGo: 7 },
  newLandmark: null,
};

const C1: AltitudeResponse = {
  metres: 40,
  level: 2,
  nextLevel: { level: 3, startsAt: 195, metresToGo: 155 },
  lessonsToNextLevel: 4,
  nextLandmark: { key: 'big-ben', name: 'Big Ben', height: 96, metresToGo: 56, lessonsToGo: 2 },
  newLandmark: null,
};

function renderAt(altitude: AltitudeResponse, achievements: AchievementsResponse) {
  return render(<AltitudeChart altitude={altitude} achievements={achievements} name="Ada Lovelace" timezone="UTC" now={NOW} />);
}

/** The top of a slot, the centre of what it holds. */
function centreOf(testID: string): number {
  const top = must(StyleSheet.flatten(screen.getByTestId(testID).props.style).top, `${testID} top`);
  return (top as number) + SLOT_HEIGHT / 2;
}

describe('AltitudeChart at 1,120m (C2)', () => {
  const achievements = makeAchievementsResponse(C2.metres);
  const layout = () =>
    heightChartLayoutOf(landmarkRowsOf(achievements, C2, NOW, 'UTC'), heightChartPosition(C2.metres), {
      chartHeight: CHART_HEIGHT,
      rowSpacing: ROW_SPACING,
      markerSpacing: MARKER_SPACING,
    });

  beforeEach(() => renderAt(C2, achievements));

  it('centres the marker on its shown offset, not on the learner\'s true height', () => {
    const { marker } = layout();
    expect(marker.shownOffset).not.toBe(marker.trueOffset);
    expect(centreOf('altitude-marker')).toBe(canvasYOf(marker.shownOffset));
  });

  it('centres the Ben Nevis card on its shown offset', () => {
    const ben = must(layout().rows.find((r) => r.key === 'ben-nevis'), 'ben-nevis offsets');
    expect(centreOf('landmark-slot-ben-nevis')).toBe(canvasYOf(ben.shownOffset));
  });

  it('keeps the marker and the card clear of Yr Wyddfa by the marker spacing', () => {
    const wyddfa = centreOf('landmark-slot-yr-wyddfa');
    expect(wyddfa - centreOf('altitude-marker')).toBeGreaterThanOrEqual(MARKER_SPACING);
    expect(centreOf('altitude-marker') - centreOf('landmark-slot-ben-nevis')).toBeGreaterThanOrEqual(MARKER_SPACING);
  });

  it('draws a leader line and a rail dot for every landmark', () => {
    for (const { key } of layout().rows) {
      expect(screen.getByTestId(`landmark-leader-${key}`)).toBeTruthy();
      expect(screen.getByTestId(`landmark-dot-${key}`)).toBeTruthy();
    }
  });

  it('draws a leader line from the learner\'s height to the marker, which has moved', () => {
    expect(screen.getByTestId('altitude-marker-leader')).toBeTruthy();
  });

  it('draws the next landmark\'s medal in colour and the locked ones locked', () => {
    expect(screen.getByTestId('medal-ben-nevis').props.accessibilityValue).toEqual({ text: 'coloured' });
    expect(screen.getByTestId('medal-everest').props.accessibilityValue).toEqual({ text: 'locked' });
  });
});

describe('AltitudeChart at 40m (C1)', () => {
  it('runs the gold rail from the marker\'s height to sea level', () => {
    renderAt(C1, makeAchievementsResponse(C1.metres));
    const learnerY = canvasYOf((1 - heightChartPosition(C1.metres)) * CHART_HEIGHT);
    const expected = railStylesOf(learnerY).gold;
    expect(StyleSheet.flatten(screen.getByTestId('altitude-rail-gold').props.style)).toEqual(expected);
  });

  it('draws the marker leader only when the marker has moved', () => {
    renderAt(C1, makeAchievementsResponse(C1.metres));
    const moved = screen.queryByTestId('altitude-marker-leader') !== null;
    const { marker } = heightChartLayoutOf(
      landmarkRowsOf(makeAchievementsResponse(C1.metres), C1, NOW, 'UTC'),
      heightChartPosition(C1.metres),
      { chartHeight: CHART_HEIGHT, rowSpacing: ROW_SPACING, markerSpacing: MARKER_SPACING },
    );
    expect(moved).toBe(marker.shownOffset !== marker.trueOffset);
  });
});
