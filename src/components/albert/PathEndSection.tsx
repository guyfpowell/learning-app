import { StyleSheet, Text, View } from 'react-native';
import { pathEndHeading, type CustomPath } from '@learning/shared';
import { colors, font, fontSize, spacing } from '@/theme';
import { PathProposalSection } from '@/components/albert/PathProposalSection';
import { SituationChangeSection } from '@/components/albert/SituationChangeSection';

interface Props {
  path: CustomPath;
  /** Premium only: a free user sees the box locked, with an upgrade (079i3). */
  locked: boolean;
  onUpgrade: () => void;
}

/**
 * Home's state for a finished Albert path (079i3, ADR-009 Amendment 1): what do they want next? The
 * situation-change box is the answer's way in, Albert's suggestion for the extension shows beside it
 * so it can be accepted or declined here, and a decline leaves the path finished and the box open.
 */
export function PathEndSection({ path, locked, onUpgrade }: Props) {
  return (
    <View testID={`path-end-${path.id}`} style={styles.section}>
      <Text testID="path-end-heading" accessibilityRole="header" style={styles.heading}>{pathEndHeading(path.name)}</Text>
      <PathProposalSection path={path} />
      <SituationChangeSection planId={path.id} locked={locked} pathFinished onUpgrade={onUpgrade} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm, marginBottom: spacing.md },
  heading: {
    fontFamily: font.displayMedium,
    fontSize:   fontSize.lg,
    color:      colors.textStrong,
  },
});
