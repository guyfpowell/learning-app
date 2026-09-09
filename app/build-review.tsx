import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useDraftStore } from '@/store/trackBuilder.store';
import { useRefinePlan, useCreateTrackPlan } from '@/hooks/useTrackBuilder';
import type { BuiltPlanTopic } from '@/services/trackBuilder.service';
import { extractError } from '@/lib/errors';
import { PLAN_FOLLOW_UP_ENABLED } from '@learning/shared';

/**
 * Review the built path — ticket 049 Chunk 5, mobile parity with the web
 * review screen.
 *
 * Shows its working: which area chose each topic, and which were added as
 * groundwork. Measured in 060, dependency closure is 53% of the average plan,
 * so a user looking at something twice as long as their ask deserves to see why.
 *
 * Intent routing is NOT here — the server returns an `action` and this screen
 * renders it. The rule that matters, *a control intent must never rebuild the
 * plan*, is the kind that gets lost in a UI; it was lost once already in the
 * 060 harness, where a correctly-detected refinement destroyed the plan.
 */

// The closure-depth control went on 2026-09-08 — 068 Chunk 7b. It chose how
// many prerequisite hops to pull in, and 049f had already removed closure. Worse
// than inert: every tap called `rebuild`, a real API call and another five
// seconds, and came back with the same topics.

export default function BuildReviewScreen() {
  const router = useRouter();
  const { draft, updateResult, clearDraft } = useDraftStore();

  const [name, setName] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastChange, setLastChange] = useState<
    { removed: number; previous: BuiltPlanTopic[] } | null
  >(null);

  const refine = useRefinePlan();
  const createPlan = useCreateTrackPlan();

  /** Back: pop the stack (lands on /build) if there is somewhere to go, else Tracks. */
  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/tracks');
  };

  useEffect(() => {
    if (!draft) {
      // Nothing to review — app restarted, or arrived here directly.
      router.replace('/build');
      return;
    }
    setName(draft.result.name);
  }, [draft, router]);

  if (!draft) return null;
  const result = draft.result;

  const onAccept = async () => {
    setError(null);
    try {
      const created = await createPlan.mutateAsync({
        name: name.trim() || 'My path',
        planJson: {
          topics: result.topics.map((t, i) => ({
            stableKey: t.stableKey,
            order: i,
            reason: t.reason,
            area: t.area ?? undefined,
            hops: t.hops,
          })),
        },
        inputJson: {
          turns: [{ text: draft.statement, level: result.level }],
        },
        // Which engine built it — 068 Chunk 4. Carried from the build, not read
        // from config at save time, which would lie the moment anyone flipped
        // the toggle between building and accepting.
        classifierEngine: result.engine ?? null,
      });
      clearDraft();
      router.replace(`/(tabs)/lessons?plan=${created.id}`);
    } catch (err) {
      setError(extractError(err));
    }
  };

  /** Re-request rather than filter: dropping hops changes what survives the cap. */
  const onFollowUp = async () => {
    if (followUp.trim().length === 0) return;
    setError(null);
    setNotice(null);
    try {
      // The requests go with it: a removal is matched against the words the user
      // used for each one, so without them "take out the job stuff" names
      // nothing and comes back as a question instead of being acted on.
      const r = await refine.mutateAsync({
        statement: followUp, plan: result.topics, sessionId: draft.sessionId,
        chunks: result.chunks,
      });
      const previous = result.topics;

      switch (r.action) {
        case 'refine':
          if (r.refusedEmpty === true) {
            setNotice('That would have removed everything, so nothing changed.');
            break;
          }
          updateResult({ ...result, topics: r.plan });
          setLastChange({ removed: r.removed.length, previous });
          setNotice(r.removed.length === 0
            ? `I couldn't find anything matching that in your path.`
            : `Removed ${r.removed.length} topic${r.removed.length === 1 ? '' : 's'}.`);
          break;
        case 'replace':
          if (r.rebuilt !== undefined) {
            updateResult(r.rebuilt);
            setName(r.rebuilt.name);
            setLastChange(null);
            setNotice('Rebuilt your path around that instead.');
          }
          break;
        case 'accept':
          await onAccept();
          return;
        case 'restart':
          clearDraft();
          router.replace('/build');
          return;
        case 'reject':
          setNotice(`Dropped that path. Tell me what you're after and I'll build another.`);
          break;
        default:
          setNotice(`I'm not sure what to change. Try naming the part you don't want.`);
      }
      setFollowUp('');
    } catch (err) {
      setError(extractError(err));
    }
  };

  const undo = () => {
    if (lastChange === null) return;
    updateResult({ ...result, topics: lastChange.previous });
    setLastChange(null);
    setNotice('Put those back.');
  };

  /**
   * How many needs the track serves — 068 Chunk 7c.
   *
   * This used to split the plan into "matched what you asked for" and
   * "groundwork they build on", by whether a topic carried the id of a request
   * that lexically resolved to it. On the Claude path almost nothing does —
   * that is the entire reason the model is there — so a 20-topic track read as
   * "3 matched, plus 17 they build on". Every topic here was chosen for this
   * person, and there is no groundwork: closure is gone.
   */
  const needCount = new Set(
    result.topics.map((t) => t.reason).filter(Boolean),
  ).size;

  /**
   * The track, grouped under the need each run serves — 068 Chunk 9b.
   *
   * The reason under every topic was the same sentence ten times in a row. No
   * server change: topics come back in the model's order, needs in order and
   * topics within them in order, so starting a new group when the reason
   * changes reproduces its structure exactly. A topic with no need joins the
   * group above it. Kept in step with the web screen.
   */
  const runs: { need: string; topics: typeof result.topics }[] = [];
  for (const t of result.topics) {
    const need = t.reason ?? '';
    const last = runs[runs.length - 1];
    if (!last || (need && need !== last.need)) runs.push({ need, topics: [t] });
    else last.topics.push(t);
  }
  const busy = refine.isPending || createPlan.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Native header — owns the top safe-area inset (item 8). Replaces the
          hand-rolled "Not now" pressable. Back lands on /build (canGoBack),
          or falls to Tracks. 069 Chunk A6. */}
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Review your path',
          headerStyle: { backgroundColor: colors.paper },
          headerTitleStyle: { fontFamily: font.semibold, fontSize: fontSize.md, color: colors.textStrong },
          headerLeft: () => (
            <Pressable
              testID="review-back"
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
        {/* Rule 6 — the loop settled rather than resolved. Say so: a plan built
            with part of the request still unanswered must not present itself as
            the finished article, and the user is the one who can correct it. */}
        {result.stoppedAtFloor === true && (
          <Text testID="stopped-at-floor" style={styles.settled}>
            I didn't get to the bottom of everything you said, so this is my best
            go at it. Tell me what to change below.
          </Text>
        )}

        <Card style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            testID="path-name"
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholderTextColor={colors.textMuted}
          />
          <Text testID="plan-counts" style={styles.counts}>
            {result.topics.length} topic{result.topics.length === 1 ? '' : 's'}, chosen for
            what you described
            {needCount > 0
              ? `, across ${needCount} thing${needCount === 1 ? '' : 's'} you need to be able to do`
              : ''}.
          </Text>
        </Card>

        <Card style={styles.card}>
          {runs.map((run, i) => (
            <View key={i} style={styles.run}>
              {/* The need, as the heading for the run that serves it — the
                  model's own words about this person. 068 Chunk 9b. */}
              {run.need ? (
                <Text testID={`run-need-${i}`} style={styles.runNeed}>{run.need}</Text>
              ) : null}
              {run.topics.map((t) => (
                <View key={t.stableKey} style={styles.topic}>
                  <Text style={styles.topicName}>{t.topicName}</Text>
                  <View style={styles.badges}>
                    <Badge label={t.level} variant="info" />
                  </View>
                </View>
              ))}
            </View>
          ))}
        </Card>

        {/* Rule 5 — what we do not teach, said plainly and never swapped for
            the nearest thing we do.

            **After the track, not before it** — 068 Chunk 9d. It sat above the
            track until someone used it: you wait six seconds and the first
            thing under the name is what you are not getting. Rule 5 says say it
            plainly, not say it first. Kept in step with the web screen. */}
        {result.notCovered ? (
          <Card style={styles.card}>
            <Text style={styles.label}>What this doesn't cover</Text>
            <Text testID="not-covered" style={styles.notCovered}>{result.notCovered}</Text>
          </Card>
        ) : null}

        {/* The "change anything" box — 068 Chunk 7d. **Hidden, not deleted.**
            Refinement runs on cue words only since the local classifier went, so
            a follow-up without one leaves the plan alone and says it did not
            understand. Flip `PLAN_FOLLOW_UP_ENABLED` to bring it back. Kept in
            step with the web screen. */}
        {PLAN_FOLLOW_UP_ENABLED && (
          <Card style={styles.card}>
            <Text style={styles.label}>Change anything</Text>
            <TextInput
              testID="follow-up"
              style={styles.followUp}
              value={followUp}
              onChangeText={setFollowUp}
              placeholder="e.g. I don't want the management stuff"
              placeholderTextColor={colors.textMuted}
              multiline
              editable={!busy}
            />
            <Button
              testID="follow-up-submit"
              label={refine.isPending ? 'Updating…' : 'Update my path'}
              variant="outline"
              disabled={busy || followUp.trim().length === 0}
              onPress={() => void onFollowUp()}
            />
            {notice !== null && (
              <Text testID="refine-notice" style={styles.notice}>{notice}</Text>
            )}
            {lastChange !== null && lastChange.removed > 0 && (
              <Button testID="refine-undo" label="Undo" variant="outline" onPress={undo} />
            )}
          </Card>
        )}

        {error !== null && (
          <Text testID="review-error" style={styles.error}>{error}</Text>
        )}

        <Button
          testID="accept-plan"
          label={createPlan.isPending ? 'Saving…' : 'Start this path'}
          disabled={busy}
          onPress={() => void onAccept()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.paper },
  headerBackBtn:  { paddingVertical: spacing.xs, paddingRight: spacing.sm },
  headerBackText: { fontFamily: font.regular, fontSize: fontSize.lg, color: colors.brand },
  content:        { padding: spacing.lg, gap: spacing.md },
  settled:        { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textStrong },
  card:           { gap: spacing.sm },
  label: {
    fontFamily: font.medium, fontSize: fontSize.xs,
    color: colors.textMuted, textTransform: 'uppercase',
  },
  input: {
    fontFamily: font.regular, fontSize: fontSize.md, color: colors.textStrong,
    padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8,
  },
  counts:    { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
  topic:     { gap: spacing.xs, paddingVertical: spacing.xs },
  topicName: { fontFamily: font.medium, fontSize: fontSize.md, color: colors.textStrong },
  badges:    { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  followUp: {
    minHeight: 64, fontFamily: font.regular, fontSize: fontSize.sm,
    color: colors.textStrong, padding: spacing.sm, borderWidth: 1,
    borderColor: colors.border, borderRadius: 8, textAlignVertical: 'top',
  },
  notice:     { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textStrong },
  run:        { marginBottom: spacing.md },
  runNeed:    { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.textStrong, marginBottom: spacing.xs },
  notCovered: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
  error:      { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.error },
});
