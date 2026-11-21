import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import {
  heightBandOf,
  heightChartLayoutOf,
  heightChartPosition,
  landmarkRowsOf,
  type AchievementsResponse,
  type AltitudeResponse,
  type LandmarkRow,
} from '@learning/shared';
import { ChartBackground } from './ChartBackground';
import { ChartRail, LevelLabelTicks } from './ChartRail';
import { LandmarkRowView } from './LandmarkRowView';
import { LandmarkSheetModal } from './LandmarkSheetModal';
import { NextLandmarkCard } from './NextLandmarkCard';
import { YouMarker } from './YouMarker';
import {
  BAND_LOOK,
  CANVAS_HEIGHT,
  CHART_HEIGHT,
  MARKER_SPACING,
  ROW_SPACING,
  canvasYOf,
} from './chartLayout';

/** The Height Chart (brief item 2, design C1–C4): the four bands, the rail with the level ticks, each landmark's leader line and row (the next one a card) and the learner's marker, on one canvas with sea level under it. Tapping a passed landmark's row opens its sheet; a tap anywhere else calls `onPress`, which switches to the Level view. */
export function AltitudeChart({
  altitude,
  achievements,
  name,
  timezone,
  now,
  onPress,
}: {
  altitude: AltitudeResponse;
  achievements: AchievementsResponse;
  name: string;
  timezone: string | undefined;
  now: Date;
  onPress: () => void;
}) {
  const [opened, setOpened] = useState<Extract<LandmarkRow, { state: 'passed' }> | null>(null);
  const { rows, marker } = heightChartLayoutOf(landmarkRowsOf(achievements, altitude, now, timezone), heightChartPosition(altitude.metres), {
    chartHeight: CHART_HEIGHT,
    rowSpacing: ROW_SPACING,
    markerSpacing: MARKER_SPACING,
  });
  return (
    <>
      <Pressable testID="altitude-chart" accessible={false} onPress={onPress} style={styles.canvas}>
        <ChartBackground />
        <ChartRail markerY={canvasYOf(marker.trueOffset)}><LevelLabelTicks /></ChartRail>
        {rows.map((row) => {
          const look = BAND_LOOK[heightBandOf(row.height).key];
          return row.state === 'next' ? (
            <NextLandmarkCard key={row.key} row={row} look={look} />
          ) : (
            <LandmarkRowView key={row.key} row={row} look={look} onPress={row.state === 'passed' ? () => setOpened(row) : null} />
          );
        })}
        <YouMarker name={name} metres={altitude.metres} level={altitude.level} offsets={marker} />
      </Pressable>
      {opened !== null && <LandmarkSheetModal landmarkKey={opened.key} sheet={opened.sheet} onClose={() => setOpened(null)} />}
    </>
  );
}

const styles = StyleSheet.create({
  canvas: { height: CANVAS_HEIGHT },
});
