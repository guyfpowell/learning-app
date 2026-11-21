import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AltitudeBand } from './AltitudeBand';
import { SeaLevelStrip } from './SeaLevelStrip';
import { BACKGROUND_GRADIENT, BANDS_TOP_DOWN } from './chartLayout';

/** What both views of the Height Chart sit on: the one gradient, the four bands with their names and boundaries, and the sea level strip. */
export function ChartBackground() {
  return (
    <>
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
    </>
  );
}
