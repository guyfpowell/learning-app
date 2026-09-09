import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useBuildPlan } from '@/hooks/useTrackBuilder';
import type { BuiltPlan, CloudTerm } from '@/services/trackBuilder.service';
import { UnderstandingCloud } from '@/components/trackBuilder/UnderstandingCloud';
import { useDraftStore } from '@/store/trackBuilder.store';
import { extractError, errorCode } from '@/lib/errors';

/**
 * Build my own path — statement in, review out.
 *
 * **The question loop went on 2026-09-08 — ticket 068 Chunk 6b.** It existed
 * because the local classifier could place only part of a statement and had to
 * ask about the rest. One Claude call reads the whole thing, so nothing comes
 * back open and there is nothing to ask. Kept in step with the web screen, as
 * it always has been: a rule only one client obeys is not a rule.
 *
 * The term cloud stays — Rule 10, their own words, still built locally.
 */

const PLACEHOLDER =
  'Tell me about yourself — your role, your level, and the kind of company you work for.\n\n' +
  'What do you want to get out of this?';

const MIN_CHARS = 10;
/**
 * A statement is a paragraph — 068 Chunk 3, and the server rejects more.
 *
 * Capped in the box rather than validated on submit: being told your words are
 * too long *after* writing them is the worst version of this, and the longest
 * real statement anyone has written is 338 characters.
 */
const MAX_CHARS = 1000;

export default function BuildScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  /**
   * A refusal and a failure look different — 068 Chunk 9f. A notice is a
   * conversation: here is how we understood you, and here is what would help.
   * Not red — red says *you broke something*, and only "that's on us" earns it.
   */
  const [notice, setNotice] = useState<string | null>(null);
  /**
   * What we understood, in their words — Rule 10. Shown between asking and
   * answering so a misreading is correctable before a plan exists.
   */
  const [cloud, setCloud] = useState<CloudTerm[]>([]);
  const sessionId = useRef<string | null>(null);

  const buildPlan = useBuildPlan();
  const setDraft = useDraftStore((s) => s.setDraft);
  const busy = buildPlan.isPending;

  /** Back: pop the stack if there is somewhere to go, otherwise land on Tracks. */
  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/tracks');
  };

  const goToReview = (result: BuiltPlan) => {
    setDraft({ statement: text, sessionId: sessionId.current, result });
    router.push('/build-review');
  };

  const onBuild = async () => {
    setError(null);
    setNotice(null);
    try {
      const result = await buildPlan.mutateAsync({ statement: text, sessionId: sessionId.current });
      sessionId.current = result.sessionId ?? sessionId.current;
      setCloud(result.cloud ?? []);
      goToReview(result);
    } catch (err) {
      if (errorCode(err) === 'TRACK_STATEMENT_TOO_THIN') setNotice(extractError(err));
      else setError(extractError(err));
    }
  };

  const tooShort = text.trim().length < MIN_CHARS;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Native header — owns the top safe-area inset (item 8). Replaces the
          hand-rolled "Not now" pressable. Back falls to Tracks, which is the
          entry point from tracks.tsx, not Lessons. 069 Chunk A6. */}
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Build my own path',
          headerStyle: { backgroundColor: colors.paper },
          headerTitleStyle: { fontFamily: font.semibold, fontSize: fontSize.md, color: colors.textStrong },
          headerLeft: () => (
            <Pressable
              testID="build-back"
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.headerBackBtn}
            >
              <Text style={styles.headerBackText}>‹</Text>
            </Pressable>
          ),
          headerBackVisible: false,
        }}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitle}>
          Describe where you are and what you want. I'll put together a path from
          the whole curriculum rather than a fixed track.
        </Text>

        <Card style={styles.card}>
          <TextInput
            testID="build-statement"
            style={styles.input}
            value={text}
            onChangeText={setText}
            maxLength={MAX_CHARS}
            placeholder={PLACEHOLDER}
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            editable={!busy}
          />

          <UnderstandingCloud terms={cloud} />

          {notice !== null && (
            <Text testID="build-notice" style={styles.notice}>{notice}</Text>
          )}
          {error !== null && (
            <Text testID="build-error" style={styles.error}>{error}</Text>
          )}

          <Button
            testID="build-submit"
            label={busy ? 'Building your path…' : 'Build my path'}
            disabled={tooShort || busy}
            onPress={() => void onBuild()}
            style={styles.submit}
          />

          {/* A build takes 4–9 seconds — 068 Chunk 7a. Five seconds of nothing
              is where a person taps again or leaves, so say what is happening.

              **No progress bar and no percentage.** Latency tracks how long the
              track turns out to be, which is the one thing we cannot know in
              advance, so a bar would be a guess presented as a measurement.
              Kept in step with the web screen, same words. */}
          {busy && (
            <View testID="build-waiting" style={styles.waiting}>
              <ActivityIndicator color={colors.textMuted} />
              <Text style={styles.waitingText}>
                Reading what you wrote and picking the topics that serve it. This
                takes a few seconds — the more you told me, the longer it takes.
              </Text>
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.paper },
  headerBackBtn:  { paddingVertical: spacing.xs, paddingRight: spacing.sm },
  headerBackText: { fontFamily: font.regular, fontSize: fontSize.lg, color: colors.brand },
  content:        { padding: spacing.lg, gap: spacing.md },
  subtitle:       { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
  card:           { gap: spacing.md },
  input: {
    minHeight: 160,
    fontFamily: font.regular,
    fontSize: fontSize.md,
    color: colors.textStrong,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  waiting:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  waitingText: { flex: 1, fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
  notice:      { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
  error:       { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.error },
  submit:      { marginTop: spacing.xs },
});
