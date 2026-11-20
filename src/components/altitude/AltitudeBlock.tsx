import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { altitudeDisplayOf, type AltitudeResponse } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { Progress } from '@/components/ui/Progress';
import { colors, font, fontSize, spacing, trackingEm } from '@/theme';

const BAR_HEIGHT = 12;
const METRES_SIZE = fontSize.xl + 4;

/** The level, the metres, the bar to the next level and the lessons to go: Home's header and the Progress tab. `onPress` makes the whole block one button, named by the text inside it (Home: it opens the Altitude chart); null leaves it for its parent to make pressable (Progress). */
export function AltitudeBlock({ altitude, trailing, onPress }: { altitude: AltitudeResponse; trailing: ReactNode; onPress: (() => void) | null }) {
  const line = altitudeDisplayOf(altitude);
  const showFooter = line.caption !== null || trailing !== null;
  const content = (
    <>
      <View style={styles.header}>
        <View style={styles.leftHalf}>
          <Text style={styles.level} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{line.title}</Text>
        </View>
        <View style={styles.rightHalf}>
          <Text style={styles.metres}>{line.metres}</Text>
        </View>
      </View>
      <Progress testID="altitude-bar" value={line.percent} tone="altitude" height={BAR_HEIGHT} trackColor={colors.altitudeTrack} />
      {showFooter && (
        <View testID="altitude-footer" style={styles.footer}>
          {line.caption !== null && (
            <View style={styles.captionHalf}>
              <Text testID="altitude-caption" style={styles.caption}>{line.caption}</Text>
            </View>
          )}
          {trailing}
        </View>
      )}
    </>
  );
  if (onPress === null) return <View testID="altitude-block" style={styles.block}>{content}</View>;
  return <Pressable testID="altitude-block" accessibilityRole="button" onPress={onPress} style={styles.block}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  block:   { gap: spacing.sm },
  header:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  leftHalf:  { flex: 1 },
  rightHalf: { flex: 1, alignItems: 'flex-end' },
  level: {
    fontFamily:    font.display,
    fontSize:      fontSize.xxl,
    letterSpacing: trackingEm.display * fontSize.xxl,
    color:         colors.textStrong,
  },
  metres:  { fontFamily: font.black, fontSize: METRES_SIZE, letterSpacing: trackingEm.title * METRES_SIZE, color: colors.altitudeDark },
  footer:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  captionHalf:  { flexShrink: 1 },
  caption: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
});
