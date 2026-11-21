import { Pressable, StyleSheet, View } from 'react-native';
import { heightChartLayoutOf, heightChartPosition, levelRowsOf, type AltitudeResponse } from '@learning/shared';
import { ChartBackground } from './ChartBackground';
import { ChartRail } from './ChartRail';
import { LevelMarker } from './LevelMarker';
import { LevelRowView } from './LevelRowView';
import { CANVAS_HEIGHT, CHART_HEIGHT, LEVEL_MARKER_SPACING, LEVEL_ROW_SPACING, canvasYOf } from './chartLayout';
import { levelStripStyleOf, levelTickStyleOf } from './levelChartStyles';

/** The Height Chart's Level view (design 2b, L1–L3): the same canvas, bands, rail and sea level as the Altitude view, with each level a strip on the scale (the learner's gold), a tick and a number on the axis, and a row with the level's name and range. A tap anywhere calls `onPress`, which switches back to the Altitude view. */
export function LevelChart({ altitude, name, onPress }: { altitude: AltitudeResponse; name: string; onPress: () => void }) {
  const { rows, marker } = heightChartLayoutOf(levelRowsOf(altitude), heightChartPosition(altitude.metres), {
    chartHeight: CHART_HEIGHT,
    rowSpacing: LEVEL_ROW_SPACING,
    markerSpacing: LEVEL_MARKER_SPACING,
  });
  return (
    <Pressable testID="level-chart" accessible={false} onPress={onPress} style={styles.canvas}>
      <ChartBackground />
      {rows.map((row) => {
        const style = row.kind === 'level' ? levelStripStyleOf(row) : null;
        return row.kind === 'level' && style !== null ? <View key={row.level} testID={`level-strip-${row.level}`} pointerEvents="none" style={style} /> : null;
      })}
      <ChartRail markerY={canvasYOf(marker.trueOffset)}>
        {rows.map((row) => (row.kind === 'level' ? <View key={row.level} testID={`level-tick-${row.level}`} pointerEvents="none" style={levelTickStyleOf(row)} /> : null))}
      </ChartRail>
      {rows.map((row) => <LevelRowView key={row.kind === 'level' ? row.level : row.kind} row={row} />)}
      <LevelMarker name={name} altitude={altitude} offsets={marker} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  canvas: { height: CANVAS_HEIGHT },
});
