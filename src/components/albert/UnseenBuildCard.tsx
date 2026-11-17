import { Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { TRACK_BUILD_PUSH, isFinishedTrackBuild, type TrackBuild } from '@learning/shared';
import { colors, font, fontSize, radius, spacing } from '@/theme';

interface UnseenBuildCardProps {
  build: TrackBuild;
  onOpen: () => void;
}

/**
 * A path build that finished while the person was away, on the Albert tab. It says what the push said (the same
 * shared words) and opens the build: the review for a path, the build screen with their words for the rest.
 */
export function UnseenBuildCard({ build, onOpen }: UnseenBuildCardProps) {
  if (!isFinishedTrackBuild(build)) return null;
  const copy = TRACK_BUILD_PUSH[build.status];
  return (
    <Pressable testID={`unseen-build-${build.id}`} accessibilityRole="button" onPress={onOpen} style={styles.card}>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card:  { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.brand, borderRadius: radius.card, padding: spacing.md, gap: spacing.xs, marginBottom: spacing.md },
  title: { fontFamily: font.bold, fontSize: fontSize.md, color: colors.textStrong },
  body:  { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textBody },
});
