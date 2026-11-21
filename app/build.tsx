import { useEffect, useEffectEvent, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, font, fontSize, levelCard, spacing } from '@/theme';
import { AlbertTile } from '@/components/albert/AlbertTile';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { useBuildScreenProgress } from '@/hooks/useBuildScreenProgress';
import { useSlowWait } from '@/hooks/useSlowWait';
import { useGoBack } from '@/hooks/useGoBack';
import {
  BUILD_SCREEN_COPY, BUILD_WAIT_STAGE, ERROR_CODES, ERROR_MESSAGES, TRACK_BUILD_STATUS, TRACK_STATEMENT_MAX, isTrackStatementTooShort,
} from '@learning/shared';
import { UnderstandingCloud } from '@/components/trackBuilder/UnderstandingCloud';
import { BuildHeader } from '@/components/trackBuilder/BuildHeader';
import { BuildWait } from '@/components/trackBuilder/BuildWait';
import { useDraftStore } from '@/store/trackBuilder.store';
import { extractError, errorCode, writeError } from '@/lib/errors';
import { BUILD_REVIEW_ROUTE, TRACKS_ROUTE } from '@/lib/routes';
import { BUILD_PHASE, WAITING_PHASES, type BuildProgress } from '@/lib/buildProgress';

/**
 * Build my own path: statement in, review out. One Claude call reads the whole statement, so
 * nothing comes back open and there is nothing to ask. The build runs in the background and the
 * screen polls for it (ADR-020), saying how the wait is going.
 *
 * The term cloud stays — Rule 10, their own words, still built locally.
 */

/** Lets the keyboard finish opening before the button is scrolled into view above it. */
const KEYBOARD_SCROLL_DELAY_MS = 150;

/** What the build came to, as the screen says it: a notice is a conversation, an error is "that's on us". */
function messagesOf(progress: BuildProgress): { notice: string | null; error: string | null } {
  if (progress.phase === BUILD_PHASE.error) {
    return errorCode(progress.error) === ERROR_CODES.TRACK_STATEMENT_TOO_THIN
      ? { notice: extractError(progress.error), error: null }
      : { notice: null, error: writeError(progress.error) };
  }
  if (progress.phase !== BUILD_PHASE.finished) return { notice: null, error: null };
  switch (progress.build.status) {
    case TRACK_BUILD_STATUS.needs_more: return { notice: progress.build.message, error: null };
    case TRACK_BUILD_STATUS.failed: return { notice: null, error: ERROR_MESSAGES[progress.build.errorCode] };
    case TRACK_BUILD_STATUS.done: return { notice: null, error: null };
  }
}

export default function BuildScreen() {
  const router = useRouter();
  // Home's "tell Albert about you" box hands over what the person has typed so far; nothing is sent until they build.
  // A finished build opened from a push or the Albert tab arrives as `buildId`; its words and outcome come from the server.
  const { statement, buildId: openedId } = useLocalSearchParams<{ statement?: string; buildId?: string }>();
  const [text, setText] = useState(statement ?? '');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  const { progress, start, openedStatement } = useBuildScreenProgress(openedId);
  const setDraft = useDraftStore((s) => s.setDraft);
  const busy = WAITING_PHASES.includes(progress.phase);
  const stage = useSlowWait(progress.phase === BUILD_PHASE.building);
  const { notice, error } = messagesOf(progress);
  const doneBuild = progress.phase === BUILD_PHASE.finished && progress.build.status === TRACK_BUILD_STATUS.done ? progress.build : null;
  /** What we understood, in their words — Rule 10: shown so a misreading is correctable. */
  const cloud = doneBuild?.plan.cloud ?? [];

  /** Back: pop the stack if there is somewhere to go, otherwise land on Tracks. */
  const handleBack = useGoBack(TRACKS_ROUTE);

  // Opens the review once, when this build is done: not again when the person edits their words.
  const openReview = useEffectEvent(() => {
    if (doneBuild === null) return;
    setDraft({ statement: doneBuild.statement, sessionId: doneBuild.plan.sessionId ?? null, result: doneBuild.plan });
    router.push(BUILD_REVIEW_ROUTE);
  });
  useEffect(() => { openReview(); }, [doneBuild?.id]);

  // The server has the person's words: show them when a build is opened, once they have loaded.
  useEffect(() => { if (openedStatement !== null) setText(openedStatement); }, [openedStatement]);

  const tooShort = isTrackStatementTooShort(text);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Back falls to Tracks, which is the entry point from tracks.tsx, not Lessons. */}
      <BuildHeader onBack={handleBack} />

      {/* The keyboard shrinks the page, so the build button stays reachable under the field. */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View testID="builder-intro" style={styles.intro}>
          <AlbertTile />
          <Text accessibilityRole="header" style={styles.heading}>{BUILD_SCREEN_COPY.heading}</Text>
        </View>

        <View style={styles.form}>
          {/* Albert's reply sits above the box, where the person is looking, and opens in cobalt. */}
          {notice !== null && (
            <Text testID="build-notice" style={styles.notice}>
              <Text style={styles.noticeLeadIn}>{BUILD_SCREEN_COPY.noticeLeadIn}</Text>{' '}{notice}
            </Text>
          )}

          <TextInput
            testID="build-statement"
            style={[styles.input, text.length > 0 && styles.inputFilled]}
            value={text}
            onChangeText={setText}
            // Capped in the box, not validated on submit: being told your words are too long
            // after writing them is the worst version of this. The server rejects more.
            maxLength={TRACK_STATEMENT_MAX}
            placeholder={BUILD_SCREEN_COPY.placeholder}
            placeholderTextColor={colors.textSubtle}
            multiline
            textAlignVertical="top"
            editable={!busy}
            // Bring the button into view above the keyboard.
            onFocus={() => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), KEYBOARD_SCROLL_DELAY_MS)}
          />

          <UnderstandingCloud terms={cloud} />

          {error !== null && (
            <Text testID="build-error" style={styles.error}>{error}</Text>
          )}

          <View style={styles.submit}>
            <EdgeButton
              testID="build-submit"
              look={{ face: colors.brand, label: colors.onBrand, edge: levelCard.intermediate.edge }}
              disabledLook={{ face: colors.border, label: colors.textSubtle }}
              label={busy ? BUILD_SCREEN_COPY.submitting : BUILD_SCREEN_COPY.submit}
              disabled={tooShort || busy}
              onPress={() => start(text)}
            />
          </View>

          {busy && (
            <BuildWait
              paused={progress.phase === BUILD_PHASE.paused}
              stage={stage}
              canLeave={stage === BUILD_WAIT_STAGE.long && progress.phase === BUILD_PHASE.building}
              onLeave={handleBack}
            />
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
  content:        { paddingHorizontal: spacing.lg, paddingTop: 18, paddingBottom: spacing.xl2, gap: 26 },
  intro:          { gap: 14 },
  heading: { fontFamily: font.black, fontSize: 30, lineHeight: 30 * 1.06, letterSpacing: -0.035 * 30, color: colors.textStrong },
  // On the page: no card, no rule.
  form:    { gap: 14 },
  // A touch more air between the box and the button.
  submit:  { paddingTop: 10 },
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
  notice:      { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
  noticeLeadIn: { fontFamily: font.bold, color: colors.brand },
  error:       { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.error },
});
