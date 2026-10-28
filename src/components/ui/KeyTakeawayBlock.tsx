import { StyleSheet, Text, View } from 'react-native';
import { colors, font, fontSize, radius, shadow, spacing, tracking } from '@/theme';

interface KeyTakeawayBlockProps {
  takeaway: string;
  testID: string;
}

/** The lesson screen's hero: the one thing to remember, on cobalt (docs/app-styling.md §4). */
export function KeyTakeawayBlock({ takeaway, testID }: KeyTakeawayBlockProps) {
  return (
    <View testID={testID} style={styles.block}>
      <Text style={styles.eyebrow}>Key takeaway</Text>
      <Text style={styles.text}>{takeaway}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.brand,
    borderRadius:    radius.card,
    padding:         spacing.lg,
    gap:             spacing.sm,
    ...shadow.brand,
  },
  eyebrow: {
    fontFamily:    font.bold,
    fontSize:      fontSize.xs,
    letterSpacing: tracking.caps,
    textTransform: 'uppercase',
    color:         colors.brandSoft,
  },
  text: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
    lineHeight: fontSize.base * 1.5,
    color:      colors.onBrand,
  },
});
