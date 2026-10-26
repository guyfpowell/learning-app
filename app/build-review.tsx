import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FollowUpCard } from '@/components/trackBuilder/FollowUpCard';
import { ReviewSaveArea } from '@/components/trackBuilder/ReviewSaveArea';
import { useDraftStore } from '@/store/trackBuilder.store';
import { useRefinePlan, useCreateTrackPlan } from '@/hooks/useTrackBuilder';
import { useCurrentUser } from '@/hooks/useEmailVerification';
import { errorCode, extractError } from '@/lib/errors';
import { PAYWALL_ROUTE } from '@/lib/subscriptions';
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  PATH_NAME_MAX,
  PLAN_FOLLOW_UP_ENABLED,
  SAVE_LOCK,
  reasonRuns,
  saveLockOf,
  toCreateTrackPlanRequest,
  type SaveLock,
} from '@learning/shared';
import { BUILD_ROUTE, HOME_ROUTE, TRACKS_ROUTE } from '@/lib/routes';

/**
 * Review the built path — ticket 049 Chunk 5, mobile parity with the web
 * review screen.
 *
 * Shows its working: which area chose each topic, and which were added as
 * groundwork. Measured in 060, dependency closure is 53% of the average plan,
 * so a user looking at something twice as long as their ask deserves to see why.
 */

// The closure-depth control went on 2026-09-08 — 068 Chunk 7b. It chose how
// many prerequisite hops to pull in, and 049f had already removed closure. Worse
// than inert: every tap called `rebuild`, a real API call and another five
// seconds, and came back with the same topics.

/** A refused save closes or locks the save area, whatever the session said. Null for any other failure. */
function refusedSaveLock(code: string | null): SaveLock | null {
  if (code === ERROR_CODES.FRESH_PATH_TRIAL_OVER) return SAVE_LOCK.trialOver;
  if (code === ERROR_CODES.ALBERT_ALLOWANCE_USED) return SAVE_LOCK.allowanceUsed;
  return null;
}

export default function BuildReviewScreen() {
  const router = useRouter();
  const { draft, updateResult, clearDraft } = useDraftStore();

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refine = useRefinePlan();
  const createPlan = useCreateTrackPlan();
  const { data: user } = useCurrentUser();
  // The server refused the save (079a, 079i3): that wins over the session. A trial-over 409 means the
  // session was stale; the hook reads it again, and this closes the save meanwhile. Never retried.
  const [serverLock, setServerLock] = useState<SaveLock | null>(null);
  // Building and reviewing are free; only the save is locked. A failed user fetch
  // leaves the save open — the server gates it anyway.
  const saveLock = serverLock ?? (user ? saveLockOf(user) : SAVE_LOCK.open);
  // Prevents the !draft guard from bouncing back to /build after onAccept clears the draft.
  const accepted = useRef(false);

  /** Back: pop the stack (lands on /build) if there is somewhere to go, else Tracks. */
  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(TRACKS_ROUTE);
  };

  useEffect(() => {
    if (draft || accepted.current) return;
    router.replace(BUILD_ROUTE);
  }, [draft, router]);

  if (!draft) return null;
  const result = draft.result;

  const onAccept = async () => {
    setError(null);
    try {
      const created = await createPlan.mutateAsync(toCreateTrackPlanRequest(name, draft));
      accepted.current = true;
      clearDraft();
      router.replace(`${HOME_ROUTE}?plan=${created.id}`);
    } catch (err) {
      const code = errorCode(err);
      const refused = refusedSaveLock(code);
      if (refused) setServerLock(refused);
      else if (code === ERROR_CODES.PLAN_LIMIT) setError(ERROR_MESSAGES[ERROR_CODES.PLAN_LIMIT]);
      else setError(extractError(err));
    }
  };

  const onRestart = () => {
    clearDraft();
    router.replace(BUILD_ROUTE);
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

  // The track, grouped under the need each run serves — 068 Chunk 9b.
  // Algorithm lives in @learning/shared (076c) — one copy, one place.
  const runs = reasonRuns(result.topics);
  const busy = refine.isPending || createPlan.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Native header — owns the top safe-area inset (item 8). Replaces the
          hand-rolled "Not now" pressable. Back lands on /build (canGoBack),
          or falls to Tracks. 069 Chunk A6. */}
      <Stack.Screen
        options={{
          headerShown: true,
          // SDK 58 on iOS 26+ defaults Stack headers to transparent (Liquid Glass), which would
          // lay the header over this screen's content.
          headerTransparent: false,
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
            maxLength={PATH_NAME_MAX}
            placeholder="Name your path"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.helper}>You can rename this any time.</Text>
          {result.description != null && (
            <Text testID="path-description" style={styles.description}>{result.description}</Text>
          )}
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
          <FollowUpCard
            draft={draft}
            refinePlan={refine.mutateAsync}
            busy={busy}
            refining={refine.isPending}
            onPlanChange={updateResult}
            onAccept={onAccept}
            onRestart={onRestart}
            onError={setError}
          />
        )}

        {error !== null && (
          <Text testID="review-error" style={styles.error}>{error}</Text>
        )}

        <ReviewSaveArea
          saveLock={saveLock}
          saving={createPlan.isPending}
          disabled={busy || name.trim().length === 0}
          onSave={() => void onAccept()}
          onUpgrade={() => router.push(PAYWALL_ROUTE)}
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
  helper:         { fontFamily: font.regular, fontSize: fontSize.xs, color: colors.textMuted },
  description:    { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textStrong },
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
  run:        { marginBottom: spacing.md },
  runNeed:    { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.textStrong, marginBottom: spacing.xs },
  notCovered: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
  error:      { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.error },
});
