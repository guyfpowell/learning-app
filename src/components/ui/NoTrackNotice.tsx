import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/**
 * The one no-track state — ticket 069 items 1+2.
 *
 * Onboarding was deleted outright, so a signed-in user can browse the whole app
 * with nothing enrolled. Nothing is locked or hidden; the screens that genuinely
 * need a track say so here, in one voice, with one route out.
 *
 * `body` is overridable because *why* a screen needs a track differs — progress
 * has nothing to chart, lessons has nothing to teach — but the heading and the
 * action stay identical so it reads as one thing wherever it appears.
 */
export function NoTrackNotice({
  body = 'Choose a track and your first lesson is ready straight away.',
}: {
  body?: string;
}) {
  const router = useRouter();

  return (
    <Card testID="no-track-notice" style={styles.card}>
      <Text style={styles.title}>Pick a track to begin</Text>
      <Text style={styles.body}>{body}</Text>
      <Button
        testID="no-track-browse-btn"
        label="Browse tracks"
        style={styles.btn}
        onPress={() => router.push('/(tabs)/tracks')}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card:  { gap: spacing.sm },
  title: {
    fontFamily: font.bold,
    fontSize:   fontSize.md,
    color:      colors.textDark,
  },
  body: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textMuted,
  },
  btn: { marginTop: spacing.sm },
});
