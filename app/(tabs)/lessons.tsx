import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isAxiosError } from 'axios';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { QuizModal } from '@/components/QuizModal';
import { useTodayLesson, useSaveLesson, useUnsaveLesson } from '@/hooks/useLesson';

const difficultyVariant = {
  beginner:     'success',
  intermediate: 'warning',
  advanced:     'error',
} as const;

function isPremiumError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 403 &&
    (error.response?.data?.code === 'LESSON_004' || error.response?.data?.code === 'LESSON_005')
}

function isTeaserLimitError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.data?.code === 'LESSON_005'
}

function PremiumModal({ visible, error, onClose }: { visible: boolean; error: unknown; onClose: () => void }) {
  const isLimit = isTeaserLimitError(error)
  const teasersUsed: number = isAxiosError(error) ? (error.response?.data?.teasersUsed ?? 0) : 0

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
          <Button label="Upgrade now" style={styles.upgradeBtn} onPress={onClose} />
          <Pressable onPress={onClose} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>Maybe later</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  )
}

export default function LessonsScreen() {
  const { data: lesson, isLoading, isError, error } = useTodayLesson();
  const [quizVisible, setQuizVisible] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const saveLesson = useSaveLesson();
  const unsaveLesson = useUnsaveLesson();

  useEffect(() => {
    setIsSaved(!!lesson?.isSaved);
  }, [lesson?.id, lesson?.isSaved]);

  const showPremiumError = isError && isPremiumError(error)

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Today's Lesson</Text>

        {isLoading && <Spinner fullScreen />}

        {isError && !showPremiumError && (
          <Text style={styles.error}>Unable to load lesson. Please try again.</Text>
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

        {!isLoading && !isError && lesson === null && (
          <Text style={styles.empty}>No lesson scheduled for today.</Text>
        )}

        {lesson && (
          <Card testID="lesson-card" style={styles.card}>
            <View style={styles.titleRow}>
              <Text testID="lesson-title" style={styles.title}>{lesson.title}</Text>
              <BookmarkButton saved={isSaved} onToggle={handleToggleSave} />
            </View>

            <View style={styles.meta}>
              <Badge
                label={lesson.difficulty}
                variant={difficultyVariant[lesson.difficulty]}
              />
              <Text style={styles.duration}>{lesson.durationMinutes} min</Text>
              {lesson.isTeaser && (
                <View testID="teaser-badge">
                  <Badge label="Free preview" variant="info" />
                </View>
              )}
            </View>

            <Button
              testID="lesson-quiz-btn"
              label="Take Quiz"
              style={styles.quizBtn}
              onPress={() => setQuizVisible(true)}
            />
          </Card>
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
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: spacing.md, flexGrow: 1 },
  heading: {
    fontFamily: font.bold,
    fontSize:   fontSize.xl,
    color:      colors.textDark,
    marginBottom: spacing.lg,
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
  quizBtn: { marginTop: spacing.sm },
  error: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.error,
    textAlign:  'center',
    marginTop:  spacing.lg,
  },
  empty: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textMuted,
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
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
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
  upgradeBtn: { width: '100%' },
  dismissBtn: { paddingVertical: spacing.sm },
  dismissText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    textAlign:  'center',
  },
});
