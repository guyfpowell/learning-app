import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { heightChartLayoutOf, heightChartPosition, initialsOf, levelMarkerOf, levelRowsOf, type AltitudeResponse, type LevelRow } from '@learning/shared';
import { must } from '@/test-utils/must';
import { CHART_HEIGHT, LEVEL_MARKER_SPACING, LEVEL_ROW_SPACING, canvasYOf, topOf } from '../chartLayout';
import { LevelChart } from '../LevelChart';
import { axisNumberStyleOf, levelLookAt, levelStripStyleOf } from '../levelChartStyles';
import { slotTopOf } from '../chartStyles';

const MID_CLIMB: AltitudeResponse = {
  metres: 1_120,
  level: 10,
  nextLevel: { level: 11, startsAt: 1_270, metresToGo: 170 },
  lessonsToNextLevel: 5,
  nextLandmark: null,
  newLandmark: null,
};

const PAST_KARMAN: AltitudeResponse = {
  metres: 100_240,
  level: 30,
  nextLevel: null,
  lessonsToNextLevel: null,
  nextLandmark: null,
  newLandmark: null,
};

const NAME = 'Ada Lovelace';

function renderChart(altitude: AltitudeResponse, onPress = jest.fn()) {
  render(<LevelChart altitude={altitude} name={NAME} onPress={onPress} />);
  return onPress;
}

function textOf(testID: string): string {
  return must(screen.getByTestId(testID).props.children, testID);
}

describe('LevelChart at 1,120m', () => {
  beforeEach(() => renderChart(MID_CLIMB));

  it('numbers the axis 1 to 30', () => {
    const numbers = screen.getAllByTestId(/^level-number-\d+$/).map((n) => n.props.children);
    expect(numbers).toEqual(Array.from({ length: 30 }, (_, i) => String(i + 1)));
  });

  it('draws the learner\'s level 10 strip gold, and its number in the gold pill', () => {
    const rows = levelRowsOf(MID_CLIMB);
    const current = must(rows.find((r): r is Extract<LevelRow, { kind: 'level' }> => r.kind === 'level' && r.level === 10), 'level 10');
    expect(StyleSheet.flatten(screen.getByTestId('level-strip-10').props.style)).toEqual(levelStripStyleOf(current));
    expect(StyleSheet.flatten(screen.getByTestId('level-number-box-10').props.style)).toEqual(axisNumberStyleOf('current', levelLookAt(topOf(current.position))).box);
  });

  it('draws the marker as LEVEL 10, the full name and the metres to the next level', () => {
    const marker = levelMarkerOf(MID_CLIMB);
    expect(marker).toEqual({ eyebrow: 'LEVEL 10', name: 'UK Mountains 2', detail: '1,120m · 170m to Level 11' });
    expect(textOf('level-marker-eyebrow')).toBe(marker.eyebrow);
    expect(textOf('level-marker-name')).toBe(marker.name);
    expect(textOf('level-marker-detail')).toBe(marker.detail);
    expect(textOf('level-marker-initials')).toBe(initialsOf(NAME));
  });

  it('draws a row for every level but the learner\'s, which the marker stands in for', () => {
    const rows = levelRowsOf(MID_CLIMB).filter((r) => r.kind === 'level' && r.level !== 10);
    expect(rows).toHaveLength(29);
    for (const row of rows) {
      if (row.kind !== 'level') continue;
      expect(textOf(`level-row-${row.level}-name`)).toBe(row.name);
      expect(textOf(`level-row-${row.level}-detail`)).toBe(row.range);
      expect(screen.getByTestId(`level-leader-${row.level}`)).toBeTruthy();
    }
    expect(screen.queryByTestId('level-row-10-name')).toBeNull();
  });

  it('draws a tick for every level', () => {
    expect(screen.getAllByTestId(/^level-tick-\d+$/)).toHaveLength(30);
  });

  it('draws no landmark rows, next landmark card or landmark marker', () => {
    expect(screen.queryAllByTestId(/^landmark-/)).toHaveLength(0);
    expect(screen.queryByTestId('altitude-marker')).toBeNull();
  });

  it('draws the rail and the gold rail from the learner to sea level', () => {
    expect(screen.getByTestId('altitude-rail')).toBeTruthy();
    expect(screen.getByTestId('altitude-rail-gold')).toBeTruthy();
    expect(screen.getByTestId('altitude-sea-level')).toBeTruthy();
  });

  it('puts a row at its place from heightChartLayoutOf, and the marker at its own', () => {
    const { rows, marker } = heightChartLayoutOf(levelRowsOf(MID_CLIMB), heightChartPosition(MID_CLIMB.metres), {
      chartHeight: CHART_HEIGHT, rowSpacing: LEVEL_ROW_SPACING, markerSpacing: LEVEL_MARKER_SPACING,
    });
    const nine = must(rows.find((r) => r.kind === 'level' && r.level === 9), 'level 9');
    expect(StyleSheet.flatten(screen.getByTestId('level-slot-9').props.style).top).toBe(slotTopOf(canvasYOf(nine.shownOffset)));
    expect(StyleSheet.flatten(screen.getByTestId('level-marker-slot').props.style).top).toBe(slotTopOf(canvasYOf(marker.shownOffset)));
  });
});

describe('In Orbit', () => {
  it('is absent at 1,120m', () => {
    renderChart(MID_CLIMB);
    expect(screen.queryByTestId('level-row-orbit-name')).toBeNull();
  });

  it('is present, with no number, at 100,240m, and there are still 30 numbered levels', () => {
    renderChart(PAST_KARMAN);
    const orbit = must(levelRowsOf(PAST_KARMAN).find((r) => r.kind === 'orbit'), 'orbit');
    expect(textOf('level-row-orbit-name')).toBe(orbit.name);
    expect(textOf('level-row-orbit-detail')).toBe(orbit.range);
    expect(screen.queryByTestId('level-number-orbit')).toBeNull();
    expect(screen.getAllByTestId(/^level-number-\d+$/)).toHaveLength(30);
  });
});

describe('tapping', () => {
  it('calls onPress from the chart', () => {
    const onPress = renderChart(MID_CLIMB);
    fireEvent.press(screen.getByTestId('level-chart'));
    expect(onPress).toHaveBeenCalled();
  });

  it('calls onPress from the marker', () => {
    const onPress = renderChart(MID_CLIMB);
    fireEvent.press(screen.getByTestId('level-marker'));
    expect(onPress).toHaveBeenCalled();
  });
});
