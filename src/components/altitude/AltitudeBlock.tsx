import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { altitudeDisplayOf, type AltitudeResponse } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { Progress } from '@/components/ui/Progress';
import { colors, font, fontSize, spacing, trackingEm } from '@/theme';

const BAR_HEIGHT = 12;
const METRES_SIZE = fontSize.xl + 4;

/** The level, the metres, the bar to the next level and the lessons to go: Home's header and the Progress tab. */
export function AltitudeBlock({ altitude, trailing }: { altitude: AltitudeResponse; trailing: ReactNode }) {
  const line = altitudeDisplayOf(altitude);
  const showFooter = line.caption !== null || trailing !== null;
  return (
    <View testID="altitude-block" style={styles.block}>
      <View style={styles.header}>
        <Text style={styles.level} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{line.title}</Text>
        <Text style={styles.metres}>{line.metres}</Text>
      </View>
      <Progress testID="altitude-bar" value={line.percent} tone="altitude" height={BAR_HEIGHT} trackColor={colors.altitudeTrack} />
      {showFooter && (
        <View testID="altitude-footer" style={styles.footer}>
          {line.caption !== null && <Text testID="altitude-caption" style={styles.caption}>{line.caption}</Text>}
          {trailing}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block:   { gap: spacing.sm },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  level: {
    flex:          1,
    fontFamily:    font.display,
    fontSize:      fontSize.xxl,
    letterSpacing: trackingEm.display * fontSize.xxl,
    color:         colors.textStrong,
  },
  metres:  { fontFamily: font.black, fontSize: METRES_SIZE, letterSpacing: trackingEm.title * METRES_SIZE, color: colors.altitudeDark },
  footer:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  caption: { flexShrink: 1, fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
});
