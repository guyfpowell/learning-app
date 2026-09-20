import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, radius, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { PremiumModal } from '@/components/ui/PremiumModal';
import { useSkills, usePaths } from '@/hooks/useTrack';
import { useUpdateTrackPlan } from '@/hooks/useTrackBuilder';
import { extractError } from '@/lib/errors';

const STEPS = [
  { title: 'Tell Albert about you',  body: 'Your role, and what you want to get better at.' },
  { title: 'Albert maps the curriculum', body: 'It picks the lessons that fit, from the whole library.' },
  { title: 'Learn your path',        body: 'Your path sits alongside your tracks, with the same progress.' },
];

export default function AlbertScreen() {
  const router = useRouter();
  const { data: skills } = useSkills();
  const { data: paths, isLoading: pathsLoading } = usePaths();
  const updatePlan = useUpdateTrackPlan();
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  // Derived, not read from the auth record: `UserAuth` carries no premium flag,
  // and adding one would change a contract BOTH clients read.
  //
  // `skill.userHasAccess` alone is NOT the signal — free users have access to
  // free tracks, so it reads as premium for everyone. Access to a skill that is
  // actually premium is the thing only a subscriber has. Premium gates BUILDING
  // a path; track access itself never is.
  const isPremium = skills?.some(
    (sk) => sk.premiumStatus === 'premium' && sk.userHasAccess
  ) ?? false;

  // The branch keys off the *unfinished* custom path, not path count (076j).
  // MAX_ACTIVE_CUSTOM_PLANS=1 guarantees at most one unfinished path; `find`
  // is intentional — clients must not assume the limit number.
  const customPaths = paths?.filter(p => p.kind === 'custom') ?? [];
  const unfinished  = customPaths.find(p => p.percentComplete < 100) ?? null;
  const hasAnyCustomPath = customPaths.length > 0;
  const allComplete = hasAnyCustomPath && !unfinished;

  function handleViewMyPath() {
    router.push('/(tabs)/tracks');
  }

  function handleConfirmArchive() {
    if (!unfinished) return;
    setArchiveError(null);
    updatePlan.mutate(
      { id: unfinished.id, status: 'archived' },
      {
        onSuccess: () => { router.push('/build'); },
        onError: (err) => {
          setArchiveError(extractError(err));
        },
      },
    );
  }

  function handleCreateNewPath() {
    if (!isPremium) { setPremiumModalVisible(true); return; }
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

  function handleBuildAnother() {
    if (!isPremium) { setPremiumModalVisible(true); return; }
    router.push('/build');
  }

  // ── Card body — varies by path state ──────────────────────────────────────
  const renderCardBody = () => {
    // Never flash the no-paths state while the fetch is in flight
    if (pathsLoading) {
      return <Spinner />;
    }

    if (unfinished) {
      // State 2: user has an unfinished custom path
      return (
        <>
          <Text style={styles.buildTitle}>Your path is waiting</Text>
          <Text style={styles.buildBody}>
            You already have a path in progress. Pick up where you left off, or start
            fresh — your current path will be removed if you do.
          </Text>
          {archiveError && (
            <Text testID="albert-archive-error" style={styles.errorText}>
              {archiveError}
            </Text>
          )}
          <Button
            testID="view-my-path"
            label="View my path"
            variant="primary"
            onPress={handleViewMyPath}
          />
          <Button
            testID="create-new-path"
            label="Create a NEW path"
            variant={isPremium ? 'outline' : 'outline'}
            onPress={handleCreateNewPath}
          />
        </>
      );
    }

    if (allComplete) {
      // State 3: user has custom paths, all 100% complete — slot is free
      return (
        <>
          <Text style={styles.buildTitle}>You've finished your path</Text>
          <Text style={styles.buildBody}>
            Great work — your custom path is complete. View it on your Tracks, or
            build a new one.
          </Text>
          <Button
            testID="view-my-path"
            label="View my path"
            variant="primary"
            onPress={handleViewMyPath}
          />
          <Button
            testID="build-another"
            label={isPremium ? 'Build another' : 'Upgrade to build a path'}
            variant={isPremium ? 'outline' : 'outline'}
            onPress={handleBuildAnother}
          />
        </>
      );
    }

    // State 1: no custom paths — original card
    return (
      <>
        <Text style={styles.buildTitle}>Build my own path</Text>
        <Text style={styles.buildBody}>
          Tell me about your role and what you want to get better at, and I'll
          build a path from the whole curriculum instead of a fixed track.
        </Text>
        <Button
          testID={isPremium ? 'build-path-start' : 'build-path-upgrade'}
          label={isPremium ? 'Start' : 'Upgrade to build a path'}
          variant={isPremium ? 'primary' : 'outline'}
          onPress={() => {
            if (isPremium) router.push('/build');
            else setPremiumModalVisible(true);
          }}
        />
      </>
    );
  };

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
          {STEPS.map((step, i) => (
            <View key={step.title} style={styles.stepRow}>
              <View style={styles.stepRail}>
                <View style={[styles.stepDot, i === 0 && styles.stepDotActive]}>
                  <Text style={[styles.stepNum, i === 0 && styles.stepNumActive]}>{i + 1}</Text>
                </View>
                {i < STEPS.length - 1 && <View style={styles.stepLine} />}
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepBody}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Build a path (moved from Tracks) ───────────────────────────── */}
        <Card testID="build-path-card" style={styles.buildCard}>
          <View style={styles.badgeRow}>
            <Badge label={isPremium ? 'Albert' : 'Premium'} variant={isPremium ? 'info' : 'warning'} />
          </View>
          {renderCardBody()}
        </Card>

        <Text style={styles.more}>More from Albert is on the way.</Text>
      </ScrollView>

      <PremiumModal
        visible={premiumModalVisible}
        onClose={() => setPremiumModalVisible(false)}
        onUpgrade={() => { setPremiumModalVisible(false); router.push('/(tabs)/profile'); }}
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

  buildCard: {
    gap:          spacing.sm,
    borderRadius: radius.xl,
    borderTopWidth: 3,
    borderTopColor: colors.brand,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  buildTitle: {
    fontFamily: font.displayMedium,
    fontSize:   fontSize.lg,
    color:      colors.textStrong,
  },
  buildBody: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    lineHeight: fontSize.sm * 1.5,
    color:      colors.textMuted,
  },
  errorText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.error,
  },

  more: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textSubtle,
    textAlign:  'center',
    marginTop:  spacing.lg,
  },
});
