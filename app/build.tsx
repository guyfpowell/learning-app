import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAnswerChunk, useBuildPlan } from '@/hooks/useTrackBuilder';
import type { BuiltPlan, RequestChunk } from '@/services/trackBuilder.service';
import { useDraftStore } from '@/store/trackBuilder.store';
import { extractError } from '@/lib/errors';

/**
 * Build my own path — ticket 049 Chunk 5, mobile parity.
 * Ticket 049b Chunk 1b — and the question loop that has to happen before a plan.
 *
 * Turn logging is the SERVER's job — this screen holds a session id and
 * nothing else.
 *
 * No model on the device. Inference is an API call, so this screen is an
 * ordinary form: no asset download, no readiness state, no ONNX runtime in the
 * bundle. That was reversed from on-device on 2026-08-04 because the model is
 * still changing and on-device meant every retrain waited for an app release.
 *
 * ── Why this screen is a loop and not a form ───────────────────────────────
 *
 * A statement is not one ask. *"I am a senior PM at a health tech, been here 4
 * years, looking to learn more about AI and be able to understand my tech
 * lead"* is TWO requests plus background, and the two need opposite things
 * said to them: AI is a whole track, so it needs narrowing; "understand my
 * tech lead" names a job title rather than a subject, so it needs explaining.
 * The server holds them apart and returns one question each; this screen shows
 * them and sends one answer at a time back to the request it was about.
 *
 * **Nothing is built while any request is open** — however good the others are.
 */

const PLACEHOLDER =
  'Tell me about yourself — your role, your level, and the kind of company you work for.\n\n' +
  'What do you want to get out of this?';

const MIN_CHARS = 10;

/**
 * Shown only when the server has nothing to ask about AND nothing to say — no
 * request could be placed at all. A per-request question is always better, and
 * so is a refusal that names the discipline, so this is the last resort rather
 * than the normal path.
 */
const NOTHING_PLACED =
  'I couldn’t tell what you want to get better at. Tell me what’s hard ' +
  'right now, or what you’d like to be able to do that you can’t yet.';

/** A request still waiting on an answer. `unservable` never is. */
const isOpen = (c: RequestChunk) => c.question !== null && c.verdict !== 'unservable';

/**
 * Whether to fall back to the general question.
 *
 * A refusal counts as having said something. Printing "I couldn't tell what you
 * want" underneath "PRINCE2 is project management, we don't teach it"
 * contradicts the line above it — we understood them exactly.
 */
const nothingToSay = (cs: RequestChunk[]) =>
  !cs.some(isOpen) && !cs.some((c) => c.verdict === 'unservable');

export default function BuildScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [ask, setAsk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The requests, as they now stand. Empty until the first build. */
  const [chunks, setChunks] = useState<RequestChunk[]>([]);
  /** Answer being typed, per request id. One box each, all visible. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const sessionId = useRef<string | null>(null);

  const buildPlan = useBuildPlan();
  const answerChunk = useAnswerChunk();
  const setDraft = useDraftStore((s) => s.setDraft);
  const busy = buildPlan.isPending || answerChunk.isPending;

  const goToReview = (result: BuiltPlan) => {
    setDraft({ statement: text, sessionId: sessionId.current, result });
    router.push('/build-review');
  };

  const onBuild = async () => {
    setAsk(null);
    setError(null);
    try {
      const result = await buildPlan.mutateAsync({ statement: text, sessionId: sessionId.current });
      sessionId.current = result.sessionId ?? sessionId.current;
      setChunks(result.chunks ?? []);

      if (result.shouldAsk) {
        // A per-request question is the normal case; the generic line is only
        // for a statement nothing could be placed from at all.
        if (nothingToSay(result.chunks ?? [])) setAsk(NOTHING_PLACED);
        return;
      }

      goToReview(result);
    } catch (err) {
      setError(extractError(err));
    }
  };

  /**
   * Answer one request. The others are untouched — that is the whole point of
   * holding them apart, and blending an answer across them is the defect this
   * loop exists to fix.
   */
  const onAnswer = async (chunkId: string) => {
    const said = (drafts[chunkId] ?? '').trim();
    if (!said) return;
    setAsk(null);
    setError(null);
    try {
      const turn = await answerChunk.mutateAsync({
        chunks, chunkId, answer: said, sessionId: sessionId.current,
      });
      sessionId.current = turn.sessionId ?? sessionId.current;
      setChunks(turn.chunks);
      setDrafts((d) => ({ ...d, [chunkId]: '' }));

      if (turn.plan && !turn.shouldAsk) {
        goToReview(turn.plan);
        return;
      }
      if (nothingToSay(turn.chunks)) setAsk(NOTHING_PLACED);
    } catch (err) {
      setError(extractError(err));
    }
  };

  const tooShort = text.trim().length < MIN_CHARS;
  const open = chunks.filter(isOpen);
  // Understood exactly, and not something we teach. There is no question to
  // ask, so it is stated and the request is closed — never a suggestion of the
  // nearest thing we do have.
  const refused = chunks.filter((c) => c.verdict === 'unservable');

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
            editable={!busy}
          />

          {refused.map((c) => (
            <Text key={c.id} testID={`build-refused-${c.id}`} style={styles.ask}>
              {c.reason}
            </Text>
          ))}

          {ask !== null && (
            <Text testID="build-ask" style={styles.ask}>{ask}</Text>
          )}
          {error !== null && (
            <Text testID="build-error" style={styles.error}>{error}</Text>
          )}

          {/* One question per open request, each with its own answer box. They
              are shown together rather than one at a time so the user can see
              everything that was understood — and everything that was not. */}
          {open.map((c) => (
            <View key={c.id} testID={`build-question-${c.id}`} style={styles.question}>
              <Text style={styles.ask}>{c.question}</Text>
              <TextInput
                testID={`build-answer-${c.id}`}
                style={styles.answer}
                value={drafts[c.id] ?? ''}
                onChangeText={(v) => setDrafts((d) => ({ ...d, [c.id]: v }))}
                multiline
                textAlignVertical="top"
                editable={!busy}
              />
              <Button
                testID={`build-answer-submit-${c.id}`}
                label="Answer"
                disabled={busy || !(drafts[c.id] ?? '').trim()}
                onPress={() => void onAnswer(c.id)}
              />
            </View>
          ))}

          <Button
            testID="build-submit"
            label={busy ? 'Building your path…' : 'Build my path'}
            disabled={tooShort || busy}
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
  question: { gap: spacing.sm },
  answer: {
    minHeight: 64,
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
