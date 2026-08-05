import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useBuildPlan } from '@/hooks/useTrackBuilder';
import { useDraftStore } from '@/store/trackBuilder.store';
import { extractError } from '@/lib/errors';

/**
 * Build my own path — ticket 049 Chunk 5, mobile parity.
 *
 * Turn logging is the SERVER's job — this screen holds a session id and
 * nothing else.
 *
 * No model on the device. Inference is an API call, so this screen is an
 * ordinary form: no asset download, no readiness state, no ONNX runtime in the
 * bundle. That was reversed from on-device on 2026-08-04 because the model is
 * still changing and on-device meant every retrain waited for an app release.
 */

const PLACEHOLDER =
  'Tell me about yourself — your role, your level, and the kind of company you work for.\n\n' +
  'What do you want to get out of this?';

const MIN_CHARS = 10;

export default function BuildScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [ask, setAsk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useRef<string | null>(null);

  const buildPlan = useBuildPlan();
  const setDraft = useDraftStore((s) => s.setDraft);

  const onBuild = async () => {
    setAsk(null);
    setError(null);
    try {
      const result = await buildPlan.mutateAsync({ statement: text, sessionId: sessionId.current });
      sessionId.current = result.sessionId ?? sessionId.current;


      // A trained outcome, not an error: the corpus deliberately contains
      // records with no areas at all. Asking beats building something wrong.
      if (result.shouldAsk) {
        setAsk(
          'I couldn’t tell what you want to get better at. Tell me what’s hard ' +
          'right now, or what you’d like to be able to do that you can’t yet.'
        );
        return;
      }

      setDraft({ statement: text, sessionId: sessionId.current, result });
      router.push('/build-review');
    } catch (err) {
      setError(extractError(err));
    }
  };

  const tooShort = text.trim().length < MIN_CHARS;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Build my own path</Text>
        <Text style={styles.subtitle}>
          Describe where you are and what you want. I’ll put together a path from
          the whole curriculum rather than a fixed track.
        </Text>

        <Card style={styles.card}>
          <TextInput
            testID="build-statement"
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={PLACEHOLDER}
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            editable={!buildPlan.isPending}
          />

          {ask !== null && (
            <Text testID="build-ask" style={styles.ask}>{ask}</Text>
          )}
          {error !== null && (
            <Text testID="build-error" style={styles.error}>{error}</Text>
          )}

          <Button
            testID="build-submit"
            label={buildPlan.isPending ? 'Building your path…' : 'Build my path'}
            disabled={tooShort || buildPlan.isPending}
            onPress={() => void onBuild()}
            style={styles.submit}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: colors.bg },
  content:  { padding: spacing.lg, gap: spacing.md },
  title:    { fontFamily: font.bold, fontSize: fontSize.xl, color: colors.textDark },
  subtitle: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
  card:     { gap: spacing.md },
  input: {
    minHeight: 160,
    fontFamily: font.regular,
    fontSize: fontSize.md,
    color: colors.textDark,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  ask:    { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textDark },
  error:  { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.error },
  submit: { marginTop: spacing.xs },
});
