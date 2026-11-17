import { StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { UNSEEN_BUILDS_LOAD_ERROR } from '@learning/shared';
import { useUnseenBuilds } from '@/hooks/useUnseenBuilds';
import { UnseenBuildCard } from '@/components/albert/UnseenBuildCard';
import { colors, font, fontSize, spacing } from '@/theme';

/**
 * The path builds that finished while the person was away, one card each. A failed read says so, even when an
 * earlier read left a list behind, and is never shown as no builds.
 */
export function UnseenBuildsSection({ onOpen }: { onOpen: (buildId: string) => void }) {
  const { data: builds, isError } = useUnseenBuilds();
  if (isError) return <Text testID="unseen-builds-load-error" style={styles.error}>{UNSEEN_BUILDS_LOAD_ERROR}</Text>;
  return (builds ?? []).map((b) => <UnseenBuildCard key={b.id} build={b} onOpen={() => onOpen(b.id)} />);
}

const styles = StyleSheet.create({
  error: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.error, marginBottom: spacing.md },
});
