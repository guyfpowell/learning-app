import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { colors, font, fontSize, radius, spacing } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { ReviewRuns } from '@/components/trackBuilder/ReviewRuns';
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
  const insets = useSafeAreaInsets();
  const { draft, updateResult, clearDraft } = useDraftStore();
  const [nameFocused, setNameFocused] = useState(false);

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
  const topicCount = `${result.topics.length} topic${result.topics.length === 1 ? '' : 's'}`;
  const needClause = needCount > 0
    ? `, across ${needCount} thing${needCount === 1 ? '' : 's'} you need to be able to do`
    : '';

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
          title: 'Your path',
          headerStyle: { backgroundColor: colors.paper },
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          headerTitleStyle: { fontFamily: font.bold, fontSize: 13, color: colors.textMuted },
          headerLeft: () => (
            <Pressable
              testID="review-back"
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

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: SAVE_CLEARANCE + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View testID="builder-intro" style={styles.intro}>
          <Text accessibilityRole="header" style={styles.heading}>Review your path</Text>
          <Text testID="plan-counts" style={styles.line}>{`${topicCount}, chosen for what you described${needClause}.`}</Text>
        </View>

        {/* Rule 6 — the loop settled rather than resolved. Say so: a plan built
            with part of the request still unanswered must not present itself as
            the finished article, and the user is the one who can correct it. */}
        {result.stoppedAtFloor === true && (
          <Text testID="stopped-at-floor" style={styles.settled}>
            I didn't get to the bottom of everything you said, so this is my best
            go at it. Tell me what to change below.
          </Text>
        )}

        <View style={styles.nameBlock}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            testID="path-name"
            style={[styles.input, nameFocused && styles.inputFocused]}
            value={name}
            onChangeText={setName}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            maxLength={PATH_NAME_MAX}
            placeholder="Name your path"
            placeholderTextColor={colors.textSubtle}
          />
          <Text style={styles.helper}>You can rename this any time.</Text>
          {result.description != null && (
            <Text testID="path-description" style={styles.description}>{result.description}</Text>
          )}
        </View>

        {/* The track, grouped under the need each run serves — 068 Chunk 9b.
            Algorithm lives in @learning/shared (076c) — one copy, one place. */}
        <ReviewRuns runs={runs} />

        {/* Rule 5 — what we do not teach, said plainly and never swapped for
            the nearest thing we do.

            **After the track, not before it** — 068 Chunk 9d. It sat above the
            track until someone used it: you wait six seconds and the first
            thing under the name is what you are not getting. Rule 5 says say it
            plainly, not say it first. Kept in step with the web screen. */}
        {result.notCovered ? (
          <View style={styles.notCoveredBlock}>
            <Text style={styles.label}>What this doesn't cover</Text>
            <Text testID="not-covered" style={styles.notCovered}>{result.notCovered}</Text>
          </View>
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
      </ScrollView>

      {/* The save floats over the foot of the list, which scrolls behind it. */}
      <LinearGradient
        testID="review-save-bar"
        pointerEvents="box-none"
        colors={[FADE_FROM, colors.paper, colors.paper]}
        locations={[0, 0.3, 1]}
        style={[styles.saveBar, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm }]}
      >
        <ReviewSaveArea
          saveLock={saveLock}
          saving={createPlan.isPending}
          disabled={busy || name.trim().length === 0}
          onSave={() => void onAccept()}
          onUpgrade={() => router.push(PAYWALL_ROUTE)}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

/** Space the list leaves under its last line so it clears the floating save button. */
const SAVE_CLEARANCE = 130;
/** The page colour at no opacity: the bar's top edge fades in from nothing. */
const FADE_FROM = 'rgba(243, 241, 236, 0)';

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.paper },
  headerBackBtn:  { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content:        { paddingHorizontal: spacing.lg, paddingTop: 14, gap: 24 },
  intro:          { gap: 10 },
  heading:        { fontFamily: font.black, fontSize: 30, lineHeight: 30 * 1.04, letterSpacing: -0.035 * 30, color: colors.textStrong },
  line:           { fontFamily: font.regular, fontSize: 16, lineHeight: 16 * 1.5, color: colors.textBody },
  settled:        { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textStrong },
  nameBlock:      { gap: 7 },
  label:          { fontFamily: font.bold, fontSize: 13, color: colors.textBody },
  input: {
    height:            54,
    fontFamily:        font.medium,
    fontSize:          17,
    color:             colors.textStrong,
    backgroundColor:   colors.surface,
    borderWidth:       1.5,
    borderColor:       colors.borderStrong,
    borderRadius:      radius.md,
    paddingHorizontal: 16,
  },
  inputFocused:   { borderWidth: 2, borderColor: colors.brand },
  helper:         { fontFamily: font.regular, fontSize: 13, color: colors.textMuted },
  description:    { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textStrong },
  notCoveredBlock: { gap: 7, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  notCovered:     { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
  error:          { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.error },
  saveBar: {
    position:          'absolute',
    left:              0,
    right:             0,
    bottom:            0,
    paddingTop:        28,
    paddingHorizontal: 20,
    gap:               spacing.sm,
  },
});
