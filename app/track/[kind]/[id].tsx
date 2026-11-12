/**
 * Track detail screen — `/track/:kind/:id`
 *
 * For looking a path over, one step at a time: the levels (with the name and overall progress),
 * a level's topics, a topic's lessons, a lesson's summary. The step is in the route's query
 * (`?group=&topic=&lesson=`), so each is its own page and Back goes up one.
 * A full-screen push in the root Stack (ADR-016), with a native header.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, font, fontSize, levelCard, press, radius, spacing } from '@/theme';
import { levelOfGroup } from '@/lib/groupLevel';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { Spinner } from '@/components/ui/Spinner';
import { TrackIcon } from '@/components/ui/TrackIcon';
import { AlbertMark } from '@/components/albert/AlbertMark';
import { LevelHeader, TopicHeader } from '@/components/learning/TrackSteps';
import { PremiumModal } from '@/components/ui/PremiumModal';
import { TrackContentsList } from '@/components/learning/TrackContentsList';
import { LessonSummary } from '@/components/learning/LessonSummary';
import { RenamableHeading } from '@/components/learning/RenamableHeading';
import { useTrackContents, usePaths, useSkills } from '@/hooks/useTrack';
import { useUpdateTrackPlan } from '@/hooks/useTrackBuilder';
import { useDetailHeader } from '@/hooks/useDetailHeader';
import { extractError } from '@/lib/errors';
import { PAYWALL_ROUTE } from '@/lib/subscriptions';
import type { TrackContents, TrackContentsLesson, UserPathKind } from '@learning/shared';
import { lessonRoute, trackRoute } from '@/lib/routes';
import { resolveTrackView, trackViewOfParams, type ResolvedTrackView, type TrackView } from '@/lib/trackView';

export default function TrackDetailScreen() {
  const router = useRouter();
  const header = useDetailHeader('Track');
  const params = useLocalSearchParams<{ kind: string; id: string; group?: string; topic?: string; lesson?: string }>();
  const { kind, id } = params;
  const pathKind = kind as UserPathKind;

  const {
    data: contents,
    isLoading,
    isError,
    error,
  } = useTrackContents(pathKind, id);

  const { data: paths } = usePaths();
  const { data: skills } = useSkills();
  const updatePlan = useUpdateTrackPlan();

  /** A custom path's id is its plan's id. */
  async function renamePath(name: string) {
    await updatePlan.mutateAsync({ id, name });
  }

  const [premiumModalVisible, setPremiumModalVisible] = useState(false);

  // The path's own line (a curated track's headline, a custom path's description) and its glyph.
  const matchingPath = paths?.find((p) => p.kind === pathKind && p.id === id) ?? null;
  const skill = pathKind === 'track' ? skills?.find((sk) => sk.id === id) : undefined;
  const summary = skill?.headline ?? matchingPath?.description ?? null;
  const isEnrolled = contents?.enrolled ?? false;

  function handleLessonPress(lesson: TrackContentsLesson) {
    if (!isEnrolled) return; // inert when browsing unenrolled
    if (lesson.locked) {
      setPremiumModalVisible(true);
      return;
    }
    router.push(lessonRoute(lesson.id));
  }

  function openView(next: TrackView) {
    router.push(trackRoute(pathKind, id, next));
  }

  // ── Loading / error ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={header} />
        <View testID="track-detail-loading" style={styles.centred}>
          <Spinner />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !contents) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={header} />
        <View testID="track-detail-error" style={styles.centred}>
          <Text style={styles.errorText}>{extractError(error)}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── The step asked for ────────────────────────────────────────────────────

  const view = resolveTrackView(contents, trackViewOfParams(params));
  // Summed from the tree, so a track you are only looking at (not enrolled) still shows its size.
  const totalLessons = contents.groups.reduce((n, g) => n + g.totalLessons, 0);
  const totalDone = contents.groups.reduce((n, g) => n + g.completedLessons, 0);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={header} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
        {view.level === 'levels' ? (
          <>
            <View testID="track-detail-head" style={styles.head}>
              <View style={styles.glyphTile}>
                {pathKind === 'custom'
                  ? <AlbertMark size={24} />
                  : <TrackIcon trackId={skill?.trackId ?? 0} size={24} color={colors.brand} />}
              </View>
              <RenamableHeading name={contents.name} onSave={pathKind === 'custom' ? renamePath : null} />
              {!!summary && <Text testID="track-detail-summary" style={styles.summary}>{summary}</Text>}
              <Text testID="track-detail-progress" style={styles.progressLabel}>
                {totalDone} of {totalLessons} lessons
              </Text>
            </View>
          </>
        ) : (
          <StepHeader view={view} contents={contents} curated={pathKind === 'track'} />
        )}

        {view.level === 'summary' ? (
          <LessonSummary
            lesson={view.lesson}
            color={levelCard[levelOfGroup(view.group.key)].base}
            // A lesson skipped earlier can be started from here; any other lesson is only looked over.
            action={view.lesson.status === 'skipped' && isEnrolled ? (
              <EdgeButton
                testID="track-detail-start-btn"
                look={{ face: colors.brand, label: colors.white, edge: press.primaryEdge }}
                label="Start lesson"
                onPress={() => handleLessonPress(view.lesson)}
              />
            ) : undefined}
          />
        ) : (
          <TrackContentsList
            contents={contents}
            view={view}
            onOpen={openView}
            onLessonPress={handleLessonPress}
          />
        )}
      </ScrollView>

      <PremiumModal
        visible={premiumModalVisible}
        onClose={() => setPremiumModalVisible(false)}
        onUpgrade={() => {
          setPremiumModalVisible(false);
          router.push(PAYWALL_ROUTE);
        }}
      />
    </SafeAreaView>
  );
}

/** The head of a step inside the path: a level's page, a topic's page, or a lesson's summary. */
function StepHeader({ view, contents, curated }: { view: Exclude<ResolvedTrackView, { level: 'levels' }>; contents: TrackContents; curated: boolean }) {
  if (view.level === 'topics') {
    return <LevelHeader group={view.group} index={contents.groups.indexOf(view.group)} count={contents.groups.length} curated={curated} />;
  }
  if (view.level === 'lessons') {
    return <TopicHeader group={view.group} topic={view.topic} index={view.group.topics.indexOf(view.topic)} />;
  }
  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content:   { paddingHorizontal: spacing.lg, paddingTop: spacing.sm3, paddingBottom: spacing.lg, flexGrow: 1 },
  centred:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },

  head: { gap: spacing.sm3, marginBottom: spacing.lg },
  glyphTile: {
    width:           48,
    height:          48,
    borderRadius:    radius.md,
    backgroundColor: colors.brandSoft,
    alignItems:      'center',
    justifyContent:  'center',
  },
  summary: {
    fontFamily: font.regular,
    fontSize:   15,
    lineHeight: 15 * 1.45,
    color:      colors.textBody,
  },
  progressLabel: {
    fontFamily: font.bold,
    fontSize:   13,
    color:      colors.textBody,
  },

  // Smaller than the path's name: a level can be a whole sentence.
  subHeading: {
    fontFamily: font.display,
    fontSize: fontSize.lg,
    color: colors.textStrong,
    marginBottom: spacing.md,
  },

  errorText: {
    fontFamily: font.regular,
    fontSize: fontSize.base,
    color: colors.error,
    textAlign: 'center',
  },
});
