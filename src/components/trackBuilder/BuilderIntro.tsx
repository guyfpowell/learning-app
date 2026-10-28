import { StyleSheet, Text, View } from 'react-native';
import { colors, font, fontSize, radius, shadow, spacing, tracking } from '@/theme';

interface BuilderIntroProps {
  heading: string;
  line: string;
  /** Goes on the line, so a screen's own testID for that text survives the move into the block. */
  lineTestID?: string;
}

/** The one cobalt block at the top of Albert's builder screens (090). Inputs and lists stay on paper below it. */
export function BuilderIntro({ heading, line, lineTestID }: BuilderIntroProps) {
  return (
    <View testID="builder-intro" style={styles.block}>
      <Text accessibilityRole="header" style={styles.heading}>{heading}</Text>
      <Text testID={lineTestID} style={styles.line}>{line}</Text>
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
  heading: {
    fontFamily:    font.display,
    fontSize:      fontSize.lg,
    letterSpacing: tracking.tight,
    color:         colors.onBrand,
  },
  line: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.brandSoft,
  },
});
