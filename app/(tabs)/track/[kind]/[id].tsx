/**
 * Track detail screen — `/(tabs)/track/:kind/:id`
 *
 * Shows the track name, overall progress, a primary lesson action, and the
 * TrackContentsTree. Lives inside (tabs)/ so the tab bar stays visible.
 * Declared with `href: null` in _layout.tsx — it does not appear in the tab bar.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, font, fontSize, radius, spacing } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Progress } from '@/components/ui/Progress';
import { PremiumModal } from '@/components/ui/PremiumModal';
import { TrackContentsTree } from '@/components/learning/TrackContentsTree';
import { useTrackContents, usePaths, useEnroll } from '@/hooks/useTrack';
import { extractError } from '@/lib/errors';
import type { TrackContentsLesson, UserPathKind } from '@learning/shared';

export default function TrackDetailScreen() {
  const router = useRouter();
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  const pathKind = kind as UserPathKind;

  const {
    data: contents,
    isLoading,
    isError,
    error,
  } = useTrackContents(pathKind, id);

  const { data: paths } = usePaths();
  const enroll = useEnroll();

  const [premiumModalVisible, setPremiumModalVisible] = useState(false);

  // Find this path's live progress data (needed for nextLesson + percent).
  const matchingPath = paths?.find((p) => p.kind === pathKind && p.id === id) ?? null;
  const nextLesson = matchingPath?.nextLesson ?? null;
  const percentComplete = matchingPath?.percentComplete ?? 0;
  const isEnrolled = contents?.enrolled ?? false;

  function handleLessonPress(lesson: TrackContentsLesson) {
    if (!isEnrolled) return; // inert when browsing unenrolled
    if (lesson.locked) {
      setPremiumModalVisible(true);
      return;
    }
    router.push(`/(tabs)/lesson/${lesson.id}` as never);
  }

  // ── Loading / error ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View testID="track-detail-loading" style={styles.centred}>
          <Spinner />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !contents) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View testID="track-detail-error" style={styles.centred}>
          <Text style={styles.errorText}>{extractError(error)}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Primary action ────────────────────────────────────────────────────────

  const lessonLabel = nextLesson?.resumePhase ? 'Continue lesson' : 'Start lesson';

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Back */}
        <Pressable
          testID="track-detail-back"
          onPress={() => router.back()}
          style={styles.backRow}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        {/* Heading */}
        <Text style={styles.heading}>{contents.name}</Text>

        {/* Overall progress */}
        {matchingPath && (
          <View testID="track-detail-progress" style={styles.progressBlock}>
            <Text style={styles.progressLabel}>
              {matchingPath.completedLessons} of {matchingPath.totalLessons} lessons
            </Text>
            <Progress value={percentComplete} tone="brand" height={6} />
          </View>
        )}

        {/* Primary action */}
        {isEnrolled && nextLesson && (
          <Button
            testID="track-detail-start-btn"
            label={lessonLabel}
            onPress={() => router.push(`/(tabs)/lesson/${nextLesson.id}` as never)}
            style={styles.actionBtn}
          />
        )}

        {!isEnrolled && pathKind === 'track' && (
          <Button
            testID="track-detail-enrol-btn"
            label="Enrol"
            loading={enroll.isPending}
            onPress={() =>
              enroll.mutate(id, {
                onSuccess: () => router.push('/(tabs)/lessons' as never),
              })
            }
            style={styles.actionBtn}
          />
        )}

        {/* Contents tree */}
        <View style={styles.treeContainer}>
          <TrackContentsTree
            contents={contents}
            onLessonPress={handleLessonPress}
          />
        </View>
      </ScrollView>

      <PremiumModal
        visible={premiumModalVisible}
        onClose={() => setPremiumModalVisible(false)}
        onUpgrade={() => {
          setPremiumModalVisible(false);
          router.push('/(tabs)/paywall' as never);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content:   { padding: spacing.md, flexGrow: 1 },
  centred:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },

  backRow: {
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  backText: {
    fontFamily: font.medium,
    fontSize: fontSize.sm,
    color: colors.brand,
  },

  heading: {
    fontFamily: font.display,
    fontSize: fontSize.xl,
    color: colors.textStrong,
    marginBottom: spacing.md,
  },

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

  treeContainer: {
    gap: spacing.sm,
  },

  errorText: {
    fontFamily: font.regular,
    fontSize: fontSize.base,
    color: colors.error,
    textAlign: 'center',
  },
});
