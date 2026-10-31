/**
 * Track detail screen — `/track/:kind/:id`
 *
 * For looking a path over, one step at a time: the levels (with the name and overall progress),
 * a level's topics, a topic's lessons, a lesson's summary. The step is in the route's query
 * (`?group=&topic=&lesson=`), so each is its own page and Back goes up one.
 * A full-screen push in the root Stack (ADR-016), with a native header.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Progress } from '@/components/ui/Progress';
import { PremiumModal } from '@/components/ui/PremiumModal';
import { TrackContentsList } from '@/components/learning/TrackContentsList';
import { LessonSummary } from '@/components/learning/LessonSummary';
import { RenamableHeading } from '@/components/learning/RenamableHeading';
import { useTrackContents, usePaths, useEnroll } from '@/hooks/useTrack';
import { useUpdateTrackPlan } from '@/hooks/useTrackBuilder';
import { useDetailHeader } from '@/hooks/useDetailHeader';
import { extractError } from '@/lib/errors';
import { PAYWALL_ROUTE } from '@/lib/subscriptions';
import type { TrackContentsLesson, UserPathKind } from '@learning/shared';
import { HOME_ROUTE, lessonRoute, trackRoute } from '@/lib/routes';
import { capitalize } from '@/lib/capitalize';
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
  const enroll = useEnroll();
  const updatePlan = useUpdateTrackPlan();

  /** A custom path's id is its plan's id. */
  async function renamePath(name: string) {
    await updatePlan.mutateAsync({ id, name });
  }

  const [premiumModalVisible, setPremiumModalVisible] = useState(false);

  // Find this path's live progress data (needed for the percent).
  const matchingPath = paths?.find((p) => p.kind === pathKind && p.id === id) ?? null;
  const percentComplete = matchingPath?.percentComplete ?? 0;
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

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={header} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {view.level === 'levels' ? (
          <>
            <RenamableHeading name={contents.name} onSave={pathKind === 'custom' ? renamePath : null} />

            {matchingPath && (
              <View testID="track-detail-progress" style={styles.progressBlock}>
                <Text style={styles.progressLabel}>
                  {matchingPath.completedLessons} of {matchingPath.totalLessons} lessons
                </Text>
                <Progress value={percentComplete} tone="brand" height={6} />
              </View>
            )}

            {/* Enrol: the one action here, for a curated track you have not started */}
            {!isEnrolled && pathKind === 'track' && (
              <Button
                testID="track-detail-enrol-btn"
                label="Enrol"
                loading={enroll.isPending}
                onPress={() =>
                  enroll.mutate(id, {
                    onSuccess: () => router.push(HOME_ROUTE),
                  })
                }
                style={styles.actionBtn}
              />
            )}
          </>
        ) : (
          <Text testID="track-detail-subheading" style={styles.subHeading}>{subHeadingOf(view)}</Text>
        )}

        {view.level === 'summary' ? (
          <LessonSummary lesson={view.lesson} />
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

/** The heading of a step inside the path: the level, the topic, or the lesson. */
function subHeadingOf(view: Exclude<ResolvedTrackView, { level: 'levels' }>): string {
  switch (view.level) {
    case 'topics':  return capitalize(view.group.label);
    case 'lessons': return view.topic.name;
    case 'summary': return view.lesson.title;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content:   { padding: spacing.md, flexGrow: 1 },
  centred:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },

  progressBlock: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  progressLabel: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  actionBtn: {
    marginBottom: spacing.lg,
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
