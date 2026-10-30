import { StyleSheet, Text, View } from 'react-native';
import { colors, font, fontSize, spacing, tracking } from '@/theme';

interface KeyTakeawayBlockProps {
  takeaway: string;
  testID: string;
}

/** The lesson screen's one thing to remember: large text beside a cobalt bar, no box (096). */
export function KeyTakeawayBlock({ takeaway, testID }: KeyTakeawayBlockProps) {
  return (
    <View testID={testID} style={styles.block}>
      <Text style={styles.eyebrow}>Key takeaway</Text>
      <Text style={styles.text}>{takeaway}</Text>
    </View>
  );
}

/** Thickness of the cobalt bar beside the takeaway (096). */
const BAR_WIDTH = spacing.xs;

const styles = StyleSheet.create({
  block: {
    borderLeftWidth: BAR_WIDTH,
    borderLeftColor: colors.brand,
    paddingLeft:     spacing.md,
    gap:             spacing.sm,
  },
  eyebrow: {
    fontFamily:    font.bold,
    fontSize:      fontSize.xs,
    letterSpacing: tracking.caps,
    textTransform: 'uppercase',
    color:         colors.brand,
  },
  text: {
    fontFamily: font.semibold,
    fontSize:   fontSize.lg,
    lineHeight: fontSize.lg * 1.35,
    color:      colors.textStrong,
  },
});
