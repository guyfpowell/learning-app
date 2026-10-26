import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/theme';
import { PremiumModal } from '@/components/ui/PremiumModal';
import { usePaths } from '@/hooks/useTrack';
import { useCurrentUser } from '@/hooks/useEmailVerification';
import { useUpdateTrackPlan } from '@/hooks/useTrackBuilder';
import { errorCode, extractError } from '@/lib/errors';
import { PAYWALL_ROUTE } from '@/lib/subscriptions';
import { PathProposalSection } from '@/components/albert/PathProposalSection';
import { SituationChangeSection } from '@/components/albert/SituationChangeSection';
import { BuildPathCard, type BuildCardState } from '@/components/albert/BuildPathCard';
import { ALBERT_PATH_ACTIONS_UNLOADED, ALBERT_STEPS, ERROR_CODES, albertPathActions, isAlbertLocked, type AlbertPathActions, type SessionUser, type UserPath } from '@learning/shared';
import { BUILD_ROUTE, TRACKS_ROUTE } from '@/lib/routes';

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

  function handleViewMyPath() {
    router.push(TRACKS_ROUTE);
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
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Intro — typographic, no mascot ─────────────────────────────── */}
        <View testID="albert-intro" style={styles.intro}>
          <Text style={styles.eyebrow}>AI ASSISTANT</Text>
          <Text style={styles.heading}>
            Meet <Text style={styles.headingAccent}>Albert</Text>
          </Text>
          <Text style={styles.lead}>
            Your personalised AI assistant. Albert builds a learning path around what you
            actually need, instead of a fixed track.
          </Text>
        </View>

        {/* ── How it works — the progress motif ──────────────────────────── */}
        <View style={styles.steps}>
          {ALBERT_STEPS.map((step, i) => (
            <View key={step.title} style={styles.stepRow}>
              <View style={styles.stepRail}>
                <View style={[styles.stepDot, i === 0 && styles.stepDotActive]}>
                  <Text style={[styles.stepNum, i === 0 && styles.stepNumActive]}>{i + 1}</Text>
                </View>
                {i < ALBERT_STEPS.length - 1 && <View style={styles.stepLine} />}
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepBody}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Albert's suggestions: one per custom path that has one, finished or not ── */}
        {proposalPaths.map(p => <PathProposalSection key={p.id} path={p} />)}

        {/* ── Build a path (moved from Tracks) ───────────────────────────── */}
        <BuildPathCard
          state={cardState}
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

        <Text style={styles.more}>More from Albert is on the way.</Text>
      </ScrollView>

      <PremiumModal
        visible={premiumModalVisible}
        onClose={() => setPremiumModalVisible(false)}
        onUpgrade={() => { setPremiumModalVisible(false); router.push(PAYWALL_ROUTE); }}
      />
    </SafeAreaView>
  );
}

const DOT = 28;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content:   { padding: spacing.lg, paddingBottom: spacing.xl2 },

  intro:   { paddingTop: spacing.md, marginBottom: spacing.lg },
  eyebrow: {
    fontFamily:    font.semibold,
    fontSize:      fontSize.xs,
    color:         colors.coral,
    letterSpacing: 1.5,
    marginBottom:  spacing.xs,
  },
  heading: {
    fontFamily:    font.display,
    fontSize:      fontSize.xxl,
    lineHeight:    fontSize.xxl * 1.08,
    letterSpacing: -0.7,
    color:         colors.textStrong,
  },
  headingAccent: { color: colors.brand },
  lead: {
    fontFamily: font.regular,
    fontSize:   fontSize.md,
    lineHeight: fontSize.md * 1.5,
    color:      colors.textBody,
    marginTop:  spacing.sm,
  },

  steps:    { marginBottom: spacing.lg },
  stepRow:  { flexDirection: 'row', gap: spacing.md },
  stepRail: { alignItems: 'center', width: DOT },
  stepDot: {
    width:           DOT,
    height:          DOT,
    borderRadius:    DOT / 2,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: colors.surface,
    borderWidth:     1.5,
    borderColor:     colors.border,
  },
  stepDotActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  stepNum: {
    fontFamily: font.semibold,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },
  stepNumActive: { color: colors.onBrand },
  stepLine: {
    flex:            1,
    width:           2,
    minHeight:       spacing.lg,
    backgroundColor: colors.borderSubtle,
    marginVertical:  2,
  },
  stepText:  { flex: 1, paddingBottom: spacing.md },
  stepTitle: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
    color:      colors.textStrong,
  },
  stepBody: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    marginTop:  2,
  },

  more: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textSubtle,
    textAlign:  'center',
    marginTop:  spacing.lg,
  },
});
