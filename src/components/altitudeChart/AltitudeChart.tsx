import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import {
  heightBandOf,
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
  altitudeLayoutOf,
  canvasYOf,
} from './chartLayout';

/** The Height Chart (brief item 2, design C1–C4): the four bands, the rail with the level ticks, each landmark's leader line and row (the next one a card) and the learner's marker, on one canvas with sea level under it. Tapping a passed landmark's row opens its sheet; a tap anywhere else calls `onPress`, which switches to the Level view. */
export function AltitudeChart({
  altitude,
  achievements,
  name,
  timezone,
  now,
  showMarker,
  onPress,
}: {
  altitude: AltitudeResponse;
  achievements: AchievementsResponse;
  name: string;
  timezone: string | undefined;
  now: Date;
  /** False while something else draws the marker (the landmark arrival). */
  showMarker: boolean;
  onPress: () => void;
}) {
  const [opened, setOpened] = useState<Extract<LandmarkRow, { state: 'passed' }> | null>(null);
  const { rows, marker } = altitudeLayoutOf(altitude, achievements, now, timezone);
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
        {showMarker && <YouMarker name={name} metres={altitude.metres} level={altitude.level} offsets={marker} />}
      </Pressable>
      {opened !== null && <LandmarkSheetModal landmarkKey={opened.key} sheet={opened.sheet} onClose={() => setOpened(null)} />}
    </>
  );
}

const styles = StyleSheet.create({
  canvas: { height: CANVAS_HEIGHT },
});
