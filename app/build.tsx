import { useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, font, fontSize, levelCard, spacing } from '@/theme';
import { AlbertTile } from '@/components/albert/AlbertTile';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { Icon } from '@/components/ui/Icon';
import { useBuildPlan } from '@/hooks/useTrackBuilder';
import {
  ERROR_CODES, TRACK_STATEMENT_MAX, isTrackStatementTooShort, type BuiltPlan, type CloudTerm,
} from '@learning/shared';
import { UnderstandingCloud } from '@/components/trackBuilder/UnderstandingCloud';
import { useDraftStore } from '@/store/trackBuilder.store';
import { extractError, errorCode } from '@/lib/errors';
import { BUILD_REVIEW_ROUTE, TRACKS_ROUTE } from '@/lib/routes';

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
  'Tell me about yourself: your role, your level, and the kind of company you work for.\n\n' +
  'What do you want to get out of this?';

export default function BuildScreen() {
  const router = useRouter();
  // Home's "tell Albert about you" box hands over what the person has typed so far; nothing is sent until they build.
  const { statement } = useLocalSearchParams<{ statement?: string }>();
  const [text, setText] = useState(statement ?? '');
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
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  const buildPlan = useBuildPlan();
  const setDraft = useDraftStore((s) => s.setDraft);
  const busy = buildPlan.isPending;

  /** Back: pop the stack if there is somewhere to go, otherwise land on Tracks. */
  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(TRACKS_ROUTE);
  };

  const goToReview = (result: BuiltPlan) => {
    setDraft({ statement: text, sessionId: sessionId.current, result });
    router.push(BUILD_REVIEW_ROUTE);
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
      if (errorCode(err) === ERROR_CODES.TRACK_STATEMENT_TOO_THIN) setNotice(extractError(err));
      else setError(extractError(err));
    }
  };

  const tooShort = isTrackStatementTooShort(text);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Native header — owns the top safe-area inset (item 8). Replaces the
          hand-rolled "Not now" pressable. Back falls to Tracks, which is the
          entry point from tracks.tsx, not Lessons. 069 Chunk A6. */}
      <Stack.Screen
        options={{
          headerShown: true,
          // SDK 58 on iOS 26+ defaults Stack headers to transparent (Liquid Glass), which would
          // lay the header over this screen's content.
          headerTransparent: false,
          title: 'Build my own path',
          headerStyle: { backgroundColor: colors.paper },
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          headerTitleStyle: { fontFamily: font.bold, fontSize: 13, color: colors.textMuted },
          headerLeft: () => (
            <Pressable
              testID="build-back"
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.headerBackBtn}
            >
              <Icon name="back" size={22} color={colors.textStrong} strokeWidth={2.2} />
            </Pressable>
          ),
          headerBackVisible: false,
        }}
      />

      {/* The keyboard shrinks the page, so Build my path stays reachable under the field. */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View testID="builder-intro" style={styles.intro}>
          <AlbertTile />
          <Text accessibilityRole="header" style={styles.heading}>Describe where you are and what you want.</Text>
          <Text style={styles.line}>I'll put together a path from the whole curriculum rather than a fixed track.</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            testID="build-statement"
            style={[styles.input, text.length > 0 && styles.inputFilled]}
            value={text}
            onChangeText={setText}
            // Capped in the box, not validated on submit: being told your words are too long
            // after writing them is the worst version of this. The server rejects more.
            maxLength={TRACK_STATEMENT_MAX}
            placeholder={PLACEHOLDER}
            placeholderTextColor={colors.textSubtle}
            multiline
            textAlignVertical="top"
            editable={!busy}
            // Bring the button into view above the keyboard.
            onFocus={() => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 150)}
          />

          <UnderstandingCloud terms={cloud} />

          {notice !== null && (
            <Text testID="build-notice" style={styles.notice}>{notice}</Text>
          )}
          {error !== null && (
            <Text testID="build-error" style={styles.error}>{error}</Text>
          )}

          <EdgeButton
            testID="build-submit"
            look={{ face: colors.brand, label: colors.onBrand, edge: levelCard.intermediate.edge }}
            disabledLook={{ face: colors.border, label: colors.textSubtle }}
            label={busy ? 'Building your path…' : 'Build my path'}
            disabled={tooShort || busy}
            onPress={() => void onBuild()}
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
                takes a few seconds. The more you told me, the longer it takes.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.paper },
  flex:           { flex: 1 },
  headerBackBtn:  { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content:        { paddingHorizontal: spacing.lg, paddingTop: 18, paddingBottom: spacing.xl2, gap: 26 },
  intro:          { gap: 14 },
  heading: { fontFamily: font.black, fontSize: 30, lineHeight: 30 * 1.06, letterSpacing: -0.035 * 30, color: colors.textStrong },
  line:    { fontFamily: font.regular, fontSize: 16, lineHeight: 16 * 1.5, color: colors.textBody },
  // On the page, under a rule: no card.
  form:    { gap: 14, paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.border },
  input: {
    minHeight:       200,
    fontFamily:      font.regular,
    fontSize:        17,
    lineHeight:      17 * 1.45,
    color:           colors.textStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingVertical:   16,
    borderWidth:     1.5,
    borderColor:     colors.borderStrong,
    borderRadius:    18,
  },
  // With words in it the ring turns cobalt.
  inputFilled: { borderWidth: 2, borderColor: colors.brand },
  waiting:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  waitingText: { flex: 1, fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
  notice:      { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
  error:       { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.error },
});
