import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  heightBandOf,
  heightChartLayoutOf,
  heightChartPosition,
  landmarkRowsOf,
  type AchievementsResponse,
  type AltitudeResponse,
  type LandmarkRow,
} from '@learning/shared';
import { AltitudeBand } from './AltitudeBand';
import { ChartRail } from './ChartRail';
import { LandmarkRowView } from './LandmarkRowView';
import { LandmarkSheetModal } from './LandmarkSheetModal';
import { NextLandmarkCard } from './NextLandmarkCard';
import { SeaLevelStrip } from './SeaLevelStrip';
import { YouMarker } from './YouMarker';
import {
  BACKGROUND_GRADIENT,
  BANDS_TOP_DOWN,
  BAND_LOOK,
  CANVAS_HEIGHT,
  CHART_HEIGHT,
  MARKER_SPACING,
  ROW_SPACING,
  canvasYOf,
} from './chartLayout';

/** The Height Chart (brief item 2, design C1–C4): the four bands, the rail with the level ticks, each landmark's leader line and row (the next one a card) and the learner's marker, on one canvas with sea level under it. Tapping a passed landmark's row opens its sheet. */
export function AltitudeChart({
  altitude,
  achievements,
  name,
  timezone,
  now,
}: {
  altitude: AltitudeResponse;
  achievements: AchievementsResponse;
  name: string;
  timezone: string | undefined;
  now: Date;
}) {
  const [opened, setOpened] = useState<Extract<LandmarkRow, { state: 'passed' }> | null>(null);
  const { rows, marker } = heightChartLayoutOf(landmarkRowsOf(achievements, altitude, now, timezone), heightChartPosition(altitude.metres), {
    chartHeight: CHART_HEIGHT,
    rowSpacing: ROW_SPACING,
    markerSpacing: MARKER_SPACING,
  });
  return (
    <View testID="altitude-chart" style={styles.canvas}>
      <LinearGradient
        pointerEvents="none"
        colors={BACKGROUND_GRADIENT.colours}
        locations={BACKGROUND_GRADIENT.locations}
        style={StyleSheet.absoluteFill}
      />
      {BANDS_TOP_DOWN.map((band, index) => (
        <AltitudeBand key={band.key} band={band} index={index} hasBoundary={index < BANDS_TOP_DOWN.length - 1} />
      ))}
      <SeaLevelStrip />
      <ChartRail markerY={canvasYOf(marker.trueOffset)} />
      {rows.map((row) => {
        const look = BAND_LOOK[heightBandOf(row.height).key];
        return row.state === 'next' ? (
          <NextLandmarkCard key={row.key} row={row} look={look} />
        ) : (
          <LandmarkRowView key={row.key} row={row} look={look} onPress={row.state === 'passed' ? () => setOpened(row) : null} />
        );
      })}
      <YouMarker name={name} metres={altitude.metres} level={altitude.level} offsets={marker} />
      {opened !== null && <LandmarkSheetModal landmarkKey={opened.key} sheet={opened.sheet} onClose={() => setOpened(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { height: CANVAS_HEIGHT },
});
