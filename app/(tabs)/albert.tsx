import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, spacing } from '@/theme';
import { AlbertWordmark } from '@/components/albert/AlbertWordmark';
import { AlbertTile } from '@/components/albert/AlbertTile';
import { TAB_BAR_CLEARANCE, TAB_SCREEN_EDGES } from '@/lib/safeArea';
import { PremiumModal } from '@/components/ui/PremiumModal';
import { usePaths } from '@/hooks/useTrack';
import { useCurrentUser } from '@/hooks/useEmailVerification';
import { useUpdateTrackPlan } from '@/hooks/useTrackBuilder';
import { errorCode, extractError } from '@/lib/errors';
import { PAYWALL_ROUTE } from '@/lib/subscriptions';
import { PathProposalSection } from '@/components/albert/PathProposalSection';
import { SituationChangeSection } from '@/components/albert/SituationChangeSection';
import { BuildPathCard, type BuildCardState } from '@/components/albert/BuildPathCard';
import { AlbertProgress, AlbertSteps, albertBarStatuses, albertStepStatuses } from '@/components/albert/AlbertSteps';
import { ALBERT_PATH_ACTIONS_UNLOADED, ERROR_CODES, albertPathActions, isAlbertLocked, type AlbertPathActions, type SessionUser, type UserPath } from '@learning/shared';
import { BUILD_ROUTE, trackRoute } from '@/lib/routes';

/** Which build card to show; the loading state comes first so the no-paths card never flashes. */
function buildCardState(
  { loading, failed, customPaths, unfinished }: { loading: boolean; failed: boolean; customPaths: UserPath[]; unfinished: UserPath | null },
): BuildCardState {
  if (loading) return 'loading';
  if (failed) return 'load-error';
  if (unfinished) return 'unfinished';
  return customPaths.length > 0 ? 'complete' : 'none';
}

/** The server refused a remove because the trial is over: the session was stale, so nothing is offered. */
const TRIAL_REFUSED_ACTIONS: AlbertPathActions = { canBuild: false, canRemove: false, trialOver: true };

/** The Albert path actions on offer: the shared rule (079i1), unless the server has already said the trial is over. */
function actionsOf(user: SessionUser | undefined, trialRefused: boolean): AlbertPathActions {
  if (trialRefused) return TRIAL_REFUSED_ACTIONS;
  return user ? albertPathActions(user) : ALBERT_PATH_ACTIONS_UNLOADED;
}

export default function AlbertScreen() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: paths, isLoading: pathsLoading, isError: pathsFailed } = usePaths();
  const updatePlan = useUpdateTrackPlan();
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  // The trial-over 409 (079i3): the hook reads the session again; this closes the card meanwhile, and if that read fails.
  const [trialRefused, setTrialRefused] = useState(false);

  // Building is free until a free user has spent their one saved path (079a); a failed fetch is
  // offered only the upgrade, since the server gates the save regardless. The used-your-free-path
  // copy needs the loaded user, so it keys off `allowanceSpent`. Track access is never gated here.
  const allowanceSpent = !!user && isAlbertLocked(user);
  const actions = actionsOf(user, trialRefused);

  // MAX_ACTIVE_CUSTOM_PLANS=1 guarantees at most one unfinished path; `find`
  // is intentional — clients must not assume the limit number.
  const customPaths = paths?.filter(p => p.kind === 'custom') ?? [];
  // A suggestion is per path: a relaxed plan limit must not hide one (079g7).
  const proposalPaths = customPaths.filter(p => p.hasProposal);
  const unfinished  = customPaths.find(p => !p.isFinished) ?? null;
  // Telling Albert what changed only makes sense partway through a path; a finished one asks what's next on Home (079i3).
  const situationPaths = customPaths.filter(p => !p.isFinished);
  const cardState = buildCardState({ loading: pathsLoading || userLoading, failed: pathsFailed, customPaths, unfinished });
  const hasPath = cardState === 'unfinished' || cardState === 'complete';
  // The path the card shows: the one in progress, else the finished one.
  const shownPath = unfinished ?? customPaths[0] ?? null;

  function handleViewMyPath() {
    if (shownPath) router.push(trackRoute('custom', shownPath.id));
  }

  function handleConfirmArchive() {
    if (!unfinished) return;
    setArchiveError(null);
    updatePlan.mutate(
      { id: unfinished.id, status: 'archived' },
      {
        onSuccess: () => { router.push(BUILD_ROUTE); },
        onError: (err) => {
          // The trial is over: the card closes and says so once. Never retried.
          if (errorCode(err) === ERROR_CODES.FRESH_PATH_TRIAL_OVER) setTrialRefused(true);
          else setArchiveError(extractError(err));
        },
      },
    );
  }

  // Removing is only to build again, so a closed build opens the upgrade instead.
  function handleCreateNewPath() {
    if (!actions.canBuild) { setPremiumModalVisible(true); return; }
    Alert.alert(
      'Start a new path?',
      'Your current path will be removed and your progress on it will no longer be reachable.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove and build', style: 'destructive', onPress: handleConfirmArchive },
      ],
      { cancelable: true },
    );
  }

  function handleBuild() {
    if (!actions.canBuild) { setPremiumModalVisible(true); return; }
    router.push(BUILD_ROUTE);
  }

  return (
    <SafeAreaView style={styles.container} edges={TAB_SCREEN_EDGES}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_CLEARANCE }]} showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {/* ── Intro: with a path, only the mark and the name (096); without, the full welcome ─────────── */}
        {hasPath ? (
          <View testID="albert-intro" style={styles.introRow}>
            <AlbertTile />
            <AlbertWordmark />
          </View>
        ) : (
          <View testID="albert-intro" style={styles.intro}>
            <AlbertTile />
            <View style={styles.title}>
              <Text style={styles.eyebrow}>AI ASSISTANT</Text>
              <Text style={styles.heading}>
                Meet <Text style={styles.headingAccent}>Albert</Text>
              </Text>
            </View>
            <Text style={styles.lead}>
              Your personalised AI assistant. Albert builds a learning path around what you
              actually need, instead of a fixed track.
            </Text>
          </View>
        )}

        {/* ── The four steps, showing where the person is (096) ─────────── */}
        {hasPath
          ? <AlbertProgress statuses={albertBarStatuses(cardState, proposalPaths.length > 0)} />
          : <AlbertSteps statuses={albertStepStatuses(cardState, proposalPaths.length > 0)} />}

        {/* ── Albert's suggestions: one per custom path that has one, finished or not ── */}
        {proposalPaths.map(p => <PathProposalSection key={p.id} path={p} />)}

        {/* ── Build a path (moved from Tracks) ───────────────────────────── */}
        <BuildPathCard
          state={cardState}
          path={shownPath}
          actions={actions}
          allowanceSpent={allowanceSpent}
          archiveError={archiveError}
          onViewMyPath={handleViewMyPath}
          onCreateNewPath={handleCreateNewPath}
          onBuild={handleBuild}
        />

        {/* ── "My situation has changed": below the build card; one per unfinished custom path; locked for a free user (079h) ── */}
        {user && situationPaths.map(p => (
          <SituationChangeSection key={p.id} planId={p.id} locked={!user.isPremium} pathFinished={false} onUpgrade={() => setPremiumModalVisible(true)} />
        ))}

      </ScrollView>

      <PremiumModal
        visible={premiumModalVisible}
        onClose={() => setPremiumModalVisible(false)}
        onUpgrade={() => { setPremiumModalVisible(false); router.push(PAYWALL_ROUTE); }}
      />
    </SafeAreaView>
  );
}

const HEADING_SIZE = 34;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content:   { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xl2 },

  intro: { gap: 12, marginBottom: 14 },
  // With a path: the mark beside the name, one line.
  introRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 2, marginBottom: 14 },
  title:   { gap: 6 },
  eyebrow: {
    fontFamily:    font.extrabold,
    fontSize:      12,
    color:         colors.brand,
    letterSpacing: 0.08 * 12,
  },
  heading: {
    fontFamily:    font.black,
    fontSize:      HEADING_SIZE,
    lineHeight:    HEADING_SIZE,
    letterSpacing: -0.04 * HEADING_SIZE,
    color:         colors.textStrong,
  },
  headingAccent: { color: colors.brand },
  lead: {
    fontFamily: font.regular,
    fontSize:   15,
    lineHeight: 15 * 1.45,
    color:      colors.textBody,
  },
});
