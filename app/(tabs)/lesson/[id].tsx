import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { isAxiosError } from 'axios';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { QuizModal } from '@/components/QuizModal';
import { useLesson, useSaveLesson, useUnsaveLesson } from '@/hooks/useLesson';
import { useEnrollments } from '@/hooks/useTrack';
import type { LessonContent, TrackEnrollmentWithProgress } from '@learning/shared';

const difficultyVariant = {
  beginner:     'success',
  intermediate: 'warning',
  advanced:     'error',
} as const;

type LessonPhase = 'collapsed' | 'expanded' | 'takeaway';

function isPremiumError(error: unknown): boolean {
  return (
    isAxiosError(error) &&
    error.response?.status === 403 &&
    (error.response?.data?.code === 'LESSON_004' || error.response?.data?.code === 'LESSON_005')
  );
}

function isTeaserLimitError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.data?.code === 'LESSON_005';
}

function isNotFoundError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}

function flooredPct(enrollment: TrackEnrollmentWithProgress): number {
  return enrollment.completedLessons > 0
    ? Math.max(1, Math.round(enrollment.percentComplete))
    : 0;
}

function LessonBody({ raw }: { raw: string }) {
  let parsed: LessonContent | null = null;
  try {
    parsed = JSON.parse(raw) as LessonContent;
  } catch {
    // not valid JSON — render as plain text
  }

  if (!parsed) {
    return <Text style={styles.contentText}>{raw}</Text>;
  }

  return (
    <View style={styles.contentBlock}>
      {!!parsed.introduction && (
        <Text testID="lesson-introduction" style={styles.contentText}>
          {parsed.introduction}
        </Text>
      )}
      {Array.isArray(parsed.keyPoints) && parsed.keyPoints.length > 0 && (
        <View style={styles.keyPoints}>
          {parsed.keyPoints.map((pt, i) => (
            <Text key={i} style={styles.keyPoint}>• {pt}</Text>
          ))}
        </View>
      )}
      {!!parsed.example && (
        <Text style={styles.exampleText}>{parsed.example}</Text>
      )}
    </View>
  );
}

function PremiumModal({
  visible,
  error,
  onClose,
  onUpgrade,
}: {
  visible: boolean;
  error: unknown;
  onClose: () => void;
  onUpgrade: () => void;
}) {
  const isLimit = isTeaserLimitError(error);
  const teasersUsed: number = isAxiosError(error) ? (error.response?.data?.teasersUsed ?? 0) : 0;
  const teasersRemaining = 3 - teasersUsed;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalIcon}>🔒</Text>
          <Text style={styles.modalTitle}>
            {isLimit ? 'Free Preview Limit Reached' : 'Premium Content'}
          </Text>
          <Text style={styles.modalBody}>
            {isLimit
              ? `You've used ${teasersUsed} of 3 free previews this month. Upgrade to continue learning.`
              : 'This is premium content. Upgrade to unlock unlimited access to all lessons.'}
          </Text>
          {isLimit && (
            <Text style={styles.teasersRemaining}>
              {teasersRemaining} free preview{teasersRemaining === 1 ? '' : 's'} remaining this month
            </Text>
          )}
          <Button label="Upgrade now" style={styles.upgradeBtn} onPress={onUpgrade} />
          <Pressable onPress={onClose} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>Maybe later</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

export default function LessonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: lesson, isLoading, isError, error } = useLesson(id ?? '');
  const { data: enrollments } = useEnrollments();
  const [quizVisible, setQuizVisible] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [phase, setPhase] = useState<LessonPhase>('collapsed');
  const saveLesson = useSaveLesson();
  const unsaveLesson = useUnsaveLesson();

  useEffect(() => {
    setIsSaved(!!lesson?.isSaved);
  }, [lesson?.id, lesson?.isSaved]);

  useEffect(() => {
    setPhase(lesson?.quizCompleted ? 'takeaway' : 'collapsed');
  }, [lesson?.id, lesson?.quizCompleted]);

  const enrollment = lesson?.skillPath?.skillId
    ? enrollments?.find(e => e.skillId === lesson.skillPath?.skillId)
    : undefined;
  const pct = enrollment ? flooredPct(enrollment) : null;

  const showPremiumError = isError && isPremiumError(error);
  const showNotFound = isError && isNotFoundError(error);
  const lessonError = isAxiosError(error)
    ? (error.response?.data?.message ?? error.message ?? 'Unable to load lesson. Please try again.')
    : 'Unable to load lesson. Please try again.';

  function handleToggleSave() {
    if (!lesson) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    if (nextSaved) {
      saveLesson.mutate(lesson.id, { onError: () => setIsSaved(!nextSaved) });
    } else {
      unsaveLesson.mutate(lesson.id, { onError: () => setIsSaved(!nextSaved) });
    }
  }

  const hasTrackHeader = !!(enrollment || lesson?.skillPath?.level || lesson?.topicName);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {isLoading && (
          <View testID="loading-indicator">
            <Spinner fullScreen />
          </View>
        )}

        {isError && showNotFound && (
          <Text testID="lesson-not-found" style={styles.error}>Lesson not found</Text>
        )}

        {isError && !showPremiumError && !showNotFound && (
          <Text testID="lesson-error" style={styles.error}>{lessonError}</Text>
        )}

        {isError && showPremiumError && (
          <Card testID="premium-error-card" style={styles.card}>
            <Text style={styles.premiumIcon}>🔒</Text>
            <Text style={styles.premiumTitle}>
              {isTeaserLimitError(error) ? 'Free Preview Limit Reached' : 'Premium Content'}
            </Text>
            <Button
              label="Learn more"
              style={styles.quizBtn}
              onPress={() => setPremiumModalVisible(true)}
            />
          </Card>
        )}

        {lesson && (
          <>
            {hasTrackHeader && (
              <View testID="track-header" style={styles.trackHeader}>
                {enrollment && (
                  <View style={styles.trackTitleRow}>
                    <Text style={styles.trackName}>{enrollment.skill.name}</Text>
                    {pct !== null && (
                      <Text style={styles.trackPct}>{pct}% complete</Text>
                    )}
                  </View>
                )}
                <View style={styles.trackMeta}>
                  {lesson.skillPath?.level && (
                    <Badge
                      label={lesson.skillPath.levelLabel ?? lesson.skillPath.level}
                      variant={
                        difficultyVariant[
                          lesson.skillPath.level as keyof typeof difficultyVariant
                        ] ?? 'info'
                      }
                    />
                  )}
                  {lesson.topicName && (
                    <Text style={styles.topicName}>{lesson.topicName}</Text>
                  )}
                  {lesson.topicName && lesson.lessonIndex != null && lesson.totalLessons != null && (
                    <Text style={styles.positionLabel}>
                      {`· Lesson ${lesson.lessonIndex} of ${lesson.totalLessons}`}
                    </Text>
                  )}
                </View>
              </View>
            )}

            <Card testID="lesson-card" style={styles.card}>
              <View style={styles.titleRow}>
                <Text testID="lesson-title" style={styles.title}>{lesson.title}</Text>
                <BookmarkButton saved={isSaved} onToggle={handleToggleSave} />
              </View>

              <View style={styles.meta}>
                <Badge
                  label={lesson.skillPath?.levelLabel ?? lesson.difficulty}
                  variant={difficultyVariant[lesson.difficulty as keyof typeof difficultyVariant] ?? 'info'}
                />
                <Text style={styles.duration}>{lesson.durationMinutes} minutes</Text>
                {lesson.isTeaser && (
                  <View testID="teaser-badge">
                    <Badge label="Free preview" variant="info" />
                  </View>
                )}
              </View>

              {lesson.summary && (
                <Text testID="lesson-summary" style={styles.summaryText}>{lesson.summary}</Text>
              )}

              {phase === 'expanded' && lesson.mediaUrl && (
                <Image
                  testID="lesson-media"
                  source={{ uri: lesson.mediaUrl }}
                  style={styles.media}
                  resizeMode="cover"
                  accessibilityLabel="Lesson media"
                />
              )}

              {phase === 'expanded' && <LessonBody raw={lesson.content} />}

              {phase === 'takeaway' && (
                <View testID="lesson-completed-banner" style={styles.completedBanner}>
                  <Text style={styles.completedBannerText}>✓ Lesson completed!</Text>
                </View>
              )}

              {phase === 'takeaway' && lesson.keyTakeaway && (
                <View testID="key-takeaway" style={styles.takeawayBlock}>
                  <Text style={styles.takeawayLabel}>Key takeaway</Text>
                  <Text style={styles.takeawayText}>{lesson.keyTakeaway}</Text>
                </View>
              )}

              {phase === 'collapsed' && (
                <Button
                  testID="continue-btn"
                  label="Continue"
                  style={styles.quizBtn}
                  onPress={() => setPhase('expanded')}
                />
              )}

              {phase === 'expanded' && (
                <Button
                  testID="key-takeaway-btn"
                  label="Key Takeaway"
                  style={[styles.quizBtn, styles.completeBtn]}
                  onPress={() => setPhase('takeaway')}
                />
              )}

              {phase === 'takeaway' && (
                <Button
                  testID="lesson-quiz-btn"
                  label="Test My Knowledge"
                  style={styles.quizBtn}
                  onPress={() => setQuizVisible(true)}
                />
              )}
            </Card>
          </>
        )}

      </ScrollView>

      {lesson && (
        <QuizModal
          visible={quizVisible}
          lesson={lesson}
          onClose={() => setQuizVisible(false)}
        />
      )}

      <PremiumModal
        visible={premiumModalVisible}
        error={error}
        onClose={() => setPremiumModalVisible(false)}
        onUpgrade={() => {
          setPremiumModalVisible(false);
          router.push('/(tabs)/settings');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: spacing.md, flexGrow: 1 },

  trackHeader: {
    gap:          spacing.xs,
    marginBottom: spacing.md,
  },
  trackTitleRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  trackName: {
    fontFamily: font.bold,
    fontSize:   fontSize.base,
    color:      colors.textDark,
  },
  trackPct: {
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
    color:      colors.teal,
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    flexWrap:      'wrap',
  },
  topicName: {
    fontFamily: font.bold,
    fontSize:   fontSize.sm,
    color:      colors.teal,
  },
  positionLabel: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },

  card: { gap: spacing.md },
  titleRow: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    gap:            spacing.sm,
  },
  title: {
    fontFamily: font.bold,
    fontSize:   fontSize.md,
    color:      colors.textDark,
    flex:       1,
  },
  meta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    flexWrap:      'wrap',
  },
  duration: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  summaryText: {
    fontFamily:  font.regular,
    fontSize:    fontSize.base,
    color:       colors.textMuted,
    fontStyle:   'italic',
    lineHeight:  fontSize.base * 1.5,
  },
  media: {
    width:        '100%',
    height:       180,
    borderRadius: 8,
  },
  contentBlock: {
    gap: spacing.sm,
  },
  contentText: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textDark,
    lineHeight: fontSize.base * 1.6,
  },
  keyPoints: {
    gap: spacing.xs,
    paddingLeft: spacing.sm,
  },
  keyPoint: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textDark,
    lineHeight: fontSize.base * 1.5,
  },
  exampleText: {
    fontFamily:      font.regular,
    fontSize:        fontSize.base,
    color:           colors.textDark,
    lineHeight:      fontSize.base * 1.6,
    backgroundColor: colors.border,
    borderRadius:    6,
    padding:         spacing.sm,
    fontStyle:       'italic',
  },
  takeawayBlock: {
    borderLeftWidth:  4,
    borderLeftColor:  colors.teal,
    paddingLeft:      spacing.md,
    paddingVertical:  spacing.sm,
    backgroundColor:  colors.tealLight + '18',
    borderRadius:     4,
    gap:              spacing.xs,
  },
  takeawayLabel: {
    fontFamily:    font.bold,
    fontSize:      fontSize.sm,
    color:         colors.teal,
    letterSpacing: 0.5,
  },
  takeawayText: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textDark,
    lineHeight: fontSize.base * 1.5,
  },
  quizBtn:     { marginTop: spacing.sm },
  completeBtn: { backgroundColor: '#F97316' },
  error: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.error,
    textAlign:  'center',
    marginTop:  spacing.lg,
  },
  premiumIcon: {
    fontSize:  40,
    textAlign: 'center',
  },
  premiumTitle: {
    fontFamily: font.bold,
    fontSize:   fontSize.md,
    color:      colors.textDark,
    textAlign:  'center',
  },
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent:  'flex-end',
  },
  modalSheet: {
    backgroundColor:     colors.bg,
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    padding:              spacing.xl,
    gap:                  spacing.md,
    alignItems:           'center',
  },
  modalIcon: {
    fontSize: 48,
  },
  modalTitle: {
    fontFamily: font.bold,
    fontSize:   fontSize.lg,
    color:      colors.textDark,
    textAlign:  'center',
  },
  modalBody: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textMuted,
    textAlign:  'center',
    lineHeight: fontSize.base * 1.5,
  },
  upgradeBtn:  { width: '100%' },
  dismissBtn:  { paddingVertical: spacing.sm },
  dismissText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    textAlign:  'center',
  },
  completedBanner: {
    backgroundColor: '#F0FDF4',
    borderRadius:    8,
    padding:         spacing.sm,
    alignItems:      'center',
  },
  completedBannerText: {
    fontFamily: font.bold,
    fontSize:   fontSize.base,
    color:      '#16A34A',
  },
  teasersRemaining: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    textAlign:  'center',
  },
});
