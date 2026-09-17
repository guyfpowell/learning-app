import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Lesson, QuizFeedback } from '@learning/shared';
import { useSubmitQuiz } from '@/hooks/useQuiz';
import { useSaveLesson, useUnsaveLesson } from '@/hooks/useLesson';
import { extractError } from '@/lib/errors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { QuizOpt } from '@/components/ui/QuizOpt';
import type { QuizOptState } from '@/components/ui/QuizOpt';
import { colors, font, fontSize, radius, spacing } from '@/theme';
import { FlameIcon } from '@/components/ui/Streak';

interface QuizModalProps {
  visible: boolean;
  lesson: Lesson;
  onClose: () => void;
}

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <View style={styles.progressTrack} testID="quiz-progress-bar">
      <View style={[styles.progressFill, { width: `${clamped}%` as `${number}%` }]} />
    </View>
  );
}

function TrackAverageBadge({
  average,
  previous,
  retakeUsed,
}: {
  average: number | null;
  previous: number | null;
  retakeUsed: boolean;
}) {
  let arrow: '↑' | '↓' | '=' | null = null;
  if (previous !== null) {
    arrow = retakeUsed ? '=' : average !== null && average >= previous ? '↑' : '↓';
  }

  return (
    <View accessibilityLabel={`Track average ${average !== null ? average + ' percent' : 'unavailable'}`}>
      <View style={styles.trackAverageValueRow}>
        <Text style={styles.scorePercent}>{average !== null ? `${average}%` : '—'}</Text>
        {arrow && (
          <Text
            style={[
              styles.trackAverageBadge,
              arrow === '↑' ? styles.trackAverageUp : arrow === '↓' ? styles.trackAverageDown : styles.trackAverageFlat,
            ]}
          >
            {arrow}
          </Text>
        )}
      </View>
      <Text style={styles.scoreFraction}>Track Average</Text>
    </View>
  );
}

/**
 * QuizFeedbackCard — ticket 069 A4.
 *
 * Single component used by both the mid-capstone per-question view and the
 * terminal results view so both always share the same block order.
 *
 * Correct:   Explanation → Question + Your answer (confirmed correct)
 * Incorrect: Correct answer → Explanation → Question + your answer
 */
function QuizFeedbackCard({ fb }: { fb: QuizFeedback }) {
  if (fb.isCorrect) {
    return (
      <View testID={`feedback-card-${fb.quizId}`} style={styles.feedbackWrapper}>
        {/* 1. Explanation */}
        <View style={styles.explanationBox}>
          <Text style={styles.feedbackSectionLabel}>Explanation</Text>
          <Text style={styles.explanationText}>{fb.explanation}</Text>
        </View>
        {/* 2. Question + confirmed correct answer */}
        <View style={styles.yourAnswerBox}>
          <Text style={styles.feedbackQuestion}>{fb.question}</Text>
          <Text style={[styles.feedbackAnswerText, styles.correct]}>✓ Your answer: {fb.userAnswer}</Text>
        </View>
      </View>
    );
  }

  return (
    <View testID={`feedback-card-${fb.quizId}`} style={styles.feedbackWrapper}>
      {/* 1. Correct answer */}
      {fb.correctAnswer != null && (
        <View style={styles.correctAnswerBox}>
          <Text style={styles.feedbackSectionLabel}>Correct answer</Text>
          <Text style={styles.correctAnswerText}>{fb.correctAnswer}</Text>
        </View>
      )}
      {/* 2. Explanation */}
      <View style={styles.explanationBox}>
        <Text style={styles.feedbackSectionLabel}>Explanation</Text>
        <Text style={styles.explanationText}>{fb.explanation}</Text>
      </View>
      {/* 3. Question + their wrong answer */}
      <View style={styles.yourAnswerBox}>
        <Text style={styles.feedbackQuestion}>{fb.question}</Text>
        <Text style={[styles.feedbackAnswerText, styles.incorrect]}>✗ Your answer: {fb.userAnswer}</Text>
      </View>
    </View>
  );
}

export function QuizModal({ visible, lesson, onClose }: QuizModalProps) {
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | undefined>(undefined);
  const [wrongAnswer, setWrongAnswer] = useState<string | undefined>(undefined);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const submit = useSubmitQuiz();
  const saveLesson = useSaveLesson();
  const unsaveLesson = useUnsaveLesson();
  const quizzes = lesson.quizzes;
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const milestoneAnim = useRef(new Animated.Value(0.8)).current;

  // Reset state each time the modal opens; resume from first unresolved question
  useEffect(() => {
    if (visible) {
      const resolved = new Set<string>(lesson.resolvedQuizIds ?? []);
      setResolvedIds(resolved);
      const allResolved = quizzes.length > 0 && quizzes.every(q => resolved.has(q.id));
      setAlreadyCompleted(quizzes.length > 0 && (!!lesson.quizCompleted || allResolved));
      const startIdx = quizzes.findIndex(q => !resolved.has(q.id));
      setCurrentQuizIndex(startIdx === -1 ? 0 : startIdx);
      setSelectedAnswer(undefined);
      setWrongAnswer(undefined);
      setIsSaved(!!lesson.isSaved);
      submit.reset();
      scoreAnim.setValue(0);
      milestoneAnim.setValue(0.8);
    }
  }, [visible, lesson.id, lesson.isSaved]);

  function handleToggleSave() {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    if (nextSaved) {
      saveLesson.mutate(lesson.id, { onError: () => setIsSaved(!nextSaved) });
    } else {
      unsaveLesson.mutate(lesson.id, { onError: () => setIsSaved(!nextSaved) });
    }
  }

  // Animate score and milestone card only at lesson finalization
  useEffect(() => {
    if (submit.data?.lessonFinalized) {
      Animated.spring(scoreAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();
      if (submit.data.milestone) {
        Animated.spring(milestoneAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [submit.data]);

  const current = quizzes[currentQuizIndex];

  function handleSelectOption(option: string) {
    setSelectedAnswer(option);
  }

  // Advance to the next question that has not yet been resolved.
  // If none remains, the lesson is already fully resolved server-side — show
  // the "already completed" view instead of silently re-showing a dead question.
  function advanceToNextUnresolved(justResolvedId?: string) {
    const newResolved = new Set(resolvedIds);
    if (justResolvedId) newResolved.add(justResolvedId);
    setResolvedIds(newResolved);
    const nextIdx = quizzes.findIndex((q, i) => i > currentQuizIndex && !newResolved.has(q.id));
    if (nextIdx === -1) {
      setAlreadyCompleted(true);
    } else {
      setCurrentQuizIndex(nextIdx);
    }
    setSelectedAnswer(undefined);
    setWrongAnswer(undefined);
    submit.reset();
  }

  // 409 LESSON_003 means this question was already answered — advance instead of erroring
  function handleQuizError(error: unknown) {
    const axiosError = error as { response?: { status?: number; data?: { code?: string } } };
    if (
      axiosError?.response?.status === 409 &&
      axiosError?.response?.data?.code === 'LESSON_003'
    ) {
      advanceToNextUnresolved(current?.id);
    }
  }

  function handleSubmit() {
    if (!current || !selectedAnswer) return;
    const answers: Record<string, string> = { [current.id]: selectedAnswer };
    submit.mutate(
      { lessonId: lesson.id, answers, ...(wrongAnswer !== undefined ? { isRetake: true } : {}) },
      { onError: handleQuizError }
    );
  }

  function handleTryAgain() {
    setWrongAnswer(selectedAnswer);
    setSelectedAnswer(undefined);
    submit.reset();
  }

  function handleNavigateAfterQuiz(nextId: string | null | undefined) {
    onClose();
    if (nextId) {
      router.replace(`/(tabs)/lesson/${nextId}` as never);
    } else {
      router.replace('/(tabs)/lessons' as never);
    }
  }

  // Inset-aware header padding — shared across all five modal blocks
  const headerStyle = [styles.header, { paddingTop: insets.top + spacing.sm }];

  // ─── Wrong first attempt — retake offer ───────────────────────────────────────
  if (submit.data && !submit.data.correct && submit.data.retakeAvailable) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={headerStyle}>
            <BookmarkButton saved={isSaved} onToggle={handleToggleSave} />
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close quiz results">
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.resultHeading}>Incorrect</Text>
            {lesson.keyTakeaway && <Text style={styles.keyTakeaway}>{lesson.keyTakeaway}</Text>}
            <Button label="Try again" onPress={handleTryAgain} style={styles.actionBtn} />
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ─── Per-question feedback — mid-capstone, lesson not yet finalized ───────────
  if (submit.data && !submit.data.lessonFinalized) {
    const fb = submit.data.feedbacks.find((f: QuizFeedback) => f.quizId === current?.id) ?? submit.data.feedbacks[0];
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={headerStyle}>
            <BookmarkButton saved={isSaved} onToggle={handleToggleSave} />
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close quiz results">
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.resultHeading}>{fb?.isCorrect ? 'Correct!' : 'Incorrect'}</Text>
            {fb && <QuizFeedbackCard fb={fb} />}
            <Button
              label="Next Question"
              onPress={() => advanceToNextUnresolved(current?.id)}
              style={styles.actionBtn}
              accessibilityLabel="Next question"
            />
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ─── Terminal / results view — lesson finalized ───────────────────────────────
  if (submit.data) {
    const { feedbacks, coaching, streak, milestone, trackAverage, previousAverage, xpAwarded } = submit.data;
    const retakeUsed = wrongAnswer !== undefined;
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={headerStyle}>
            <BookmarkButton saved={isSaved} onToggle={handleToggleSave} />
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close quiz results">
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.resultHeading}>Quiz Complete!</Text>

            {/* Animated track average */}
            <Animated.View style={{ transform: [{ scale: scoreAnim }] }}>
              <TrackAverageBadge average={trackAverage} previous={previousAverage} retakeUsed={retakeUsed} />
            </Animated.View>

            {/* Streak counter */}
            {streak > 0 && (
              <View style={styles.streakRow}>
                <FlameIcon size={18} />
                <Text style={styles.streakText}>{streak}-day streak</Text>
              </View>
            )}

            {/* XP award */}
            {xpAwarded != null && xpAwarded > 0 && (
              <View testID="xp-chip" style={styles.xpChip}>
                <Text style={styles.xpChipText}>+{xpAwarded} XP</Text>
              </View>
            )}

            {/* Milestone celebration */}
            {milestone && (
              <Animated.View
                testID="milestone-card"
                style={[styles.milestoneCard, { transform: [{ scale: milestoneAnim }], opacity: milestoneAnim }]}
                accessibilityRole="alert"
              >
                <Text style={styles.milestoneText}>🎉 {milestone}!</Text>
                <Text style={styles.milestoneSubtext}>
                  {streak >= 30 ? "You're unstoppable." : "Keep going!"}
                </Text>
              </Animated.View>
            )}

            {/* Feedback cards — one per quiz question */}
            {feedbacks.map((fb: QuizFeedback) => (
              <QuizFeedbackCard key={fb.quizId} fb={fb} />
            ))}

            {coaching && (
              <View style={styles.coachingCard}>
                <Text style={styles.coachingLabel}>AI Coaching</Text>
                <Text style={styles.coachingText}>{coaching}</Text>
              </View>
            )}

            {/* Key takeaway — last, per item 6 */}
            {lesson.keyTakeaway && (
              <View testID="quiz-key-takeaway" style={styles.quizKeyTakeawayCard}>
                <Text style={styles.quizKeyTakeawayLabel}>KEY TAKEAWAY</Text>
                <Text style={styles.quizKeyTakeawayText}>{lesson.keyTakeaway}</Text>
              </View>
            )}

            <Button
              label={submit.data.nextLessonId ? 'Next Lesson' : 'Back to Dashboard'}
              onPress={() => handleNavigateAfterQuiz(submit.data?.nextLessonId)}
              style={styles.doneBtn}
            />
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ─── Already completed — no unresolved question left, and no fresh result to show ──
  if (alreadyCompleted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={headerStyle}>
            <BookmarkButton saved={isSaved} onToggle={handleToggleSave} />
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close quiz results">
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.resultHeading}>Already Completed</Text>
            <Text style={styles.completedBody}>You've already finished this lesson's quiz.</Text>
            <Button
              label={lesson.nextLessonId ? 'Next Lesson' : 'Back to Dashboard'}
              onPress={() => handleNavigateAfterQuiz(lesson.nextLessonId)}
              style={styles.doneBtn}
            />
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ─── Quiz view ───────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={[headerStyle, styles.headerQuiz]}>
          <View style={styles.spacer} />
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {quizzes.length === 0 ? (
            <Text style={styles.empty}>No quiz available for this lesson.</Text>
          ) : (
            <>
              {quizzes.length > 1 && (
                <View style={styles.progressWrap}>
                  <View style={styles.progressRow}>
                    <Text style={styles.progress}>
                      Question {currentQuizIndex + 1} of {quizzes.length}
                    </Text>
                    <Text style={styles.progress}>
                      {Math.round(((currentQuizIndex + 1) / quizzes.length) * 100)}%
                    </Text>
                  </View>
                  <ProgressBar value={((currentQuizIndex + 1) / quizzes.length) * 100} />
                </View>
              )}

              <Text style={styles.question}>{current.question}</Text>

              {current.type === 'multiple-choice' ? (
                <View style={styles.options}>
                  {current.options.map((option, idx) => {
                    const optKey = String.fromCharCode(65 + idx); // A, B, C, D…
                    let state: QuizOptState = 'idle';
                    if (wrongAnswer === option) state = 'incorrect';
                    else if (selectedAnswer === option) state = 'selected';
                    return (
                      <QuizOpt
                        key={option}
                        testID={`quiz-opt-${idx}`}
                        optKey={optKey}
                        label={option}
                        state={state}
                        onPress={() => handleSelectOption(option)}
                      />
                    );
                  })}
                </View>
              ) : (
                <Input
                  placeholder="Your answer..."
                  value={selectedAnswer ?? ''}
                  onChangeText={handleSelectOption}
                  style={styles.shortAnswerInput}
                />
              )}

              {submit.isError && (
                <Text testID="submit-error" style={styles.error}>{extractError(submit.error)}</Text>
              )}

              <Button
                label="Submit"
                onPress={handleSubmit}
                loading={submit.isPending}
                disabled={!selectedAnswer}
                style={styles.actionBtn}
              />
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    // paddingTop is applied inline via useSafeAreaInsets() — not hardcoded here
    paddingBottom:     spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerQuiz: {
    // quiz question view has no bookmark — left spacer maintains alignment
  },
  spacer:    { width: 32 },
  closeBtn:  { padding: spacing.xs },
  closeText: {
    fontFamily: font.semibold,
    fontSize:   fontSize.md,
    color:      colors.textMuted,
  },
  content:   { padding: spacing.md, flexGrow: 1 },
  progressWrap: { marginBottom: spacing.md },
  progressRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginBottom:   spacing.xs,
  },
  progress: {
    fontFamily:   font.medium,
    fontSize:     fontSize.sm,
    color:        colors.textMuted,
  },
  progressTrack: {
    height:          6,
    backgroundColor: colors.borderSubtle,
    borderRadius:    3,
    overflow:        'hidden',
  },
  progressFill: {
    height:          6,
    backgroundColor: colors.brand,
    borderRadius:    3,
  },
  question: {
    fontFamily:   font.semibold,
    fontSize:     fontSize.md,
    color:        colors.textStrong,
    marginBottom: spacing.lg,
  },
  options:   { gap: spacing.sm, marginBottom: spacing.lg },
  shortAnswerInput:   { marginBottom: spacing.lg },
  actionBtn:          { marginTop: spacing.sm },
  error: {
    fontFamily:   font.regular,
    fontSize:     fontSize.sm,
    color:        colors.error,
    marginBottom: spacing.sm,
  },
  empty: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textMuted,
    textAlign:  'center',
    marginTop:  spacing.xl,
  },
  completedBody: {
    fontFamily:   font.regular,
    fontSize:     fontSize.base,
    color:        colors.textMuted,
    textAlign:    'center',
    marginBottom: spacing.xl,
  },
  keyTakeaway: {
    fontFamily:   font.regular,
    fontSize:     fontSize.base,
    color:        colors.textBody,
    textAlign:    'center',
    marginBottom: spacing.xl,
  },
  // ─── Results ────────────────────────────────────────────────────────────────
  resultHeading: {
    fontFamily:   font.semibold,
    fontSize:     fontSize.xl,
    color:        colors.textStrong,
    textAlign:    'center',
    marginTop:    spacing.lg,
    marginBottom: spacing.md,
  },
  scorePercent: {
    fontFamily:   font.semibold,
    fontSize:     fontSize.xxl,
    color:        colors.brand,
    textAlign:    'center',
  },
  scoreFraction: {
    fontFamily:   font.regular,
    fontSize:     fontSize.base,
    color:        colors.textMuted,
    textAlign:    'center',
    marginTop:    spacing.xs,
    marginBottom: spacing.xl,
  },
  trackAverageValueRow: {
    flexDirection: 'row',
    alignItems:    'center',
    justifyContent: 'center',
    gap:           spacing.xs,
  },
  trackAverageBadge: {
    fontFamily: font.semibold,
    fontSize:   fontSize.lg ?? fontSize.md,
  },
  trackAverageUp:   { color: colors.success },
  trackAverageDown: { color: colors.error },
  trackAverageFlat: { color: colors.success },
  streakRow: {
    flexDirection:  'row',
    justifyContent: 'center',
    marginBottom:   spacing.md,
  },
  streakText: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
    color:      colors.textStrong,
  },
  xpChip: {
    alignSelf:         'center',
    backgroundColor:   colors.xpSoft,
    borderRadius:      radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs,
    marginBottom:      spacing.md,
  },
  xpChipText: {
    fontFamily: font.semibold,
    fontSize:   fontSize.sm,
    color:      colors.xp,
  },
  milestoneCard: {
    backgroundColor: colors.coral,
    borderRadius:    radius.card,
    padding:         spacing.md,
    marginBottom:    spacing.lg,
    alignItems:      'center',
  },
  milestoneText: {
    fontFamily: font.semibold,
    fontSize:   fontSize.lg ?? fontSize.md,
    color:      '#ffffff',
    textAlign:  'center',
  },
  milestoneSubtext: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      '#fff7ed',
    marginTop:  spacing.xs,
    textAlign:  'center',
  },
  // ─── QuizFeedbackCard ───────────────────────────────────────────────────────
  feedbackWrapper: {
    gap:          spacing.sm,
    marginBottom: spacing.md,
  },
  explanationBox: {
    backgroundColor: colors.brandSoft,
    borderRadius:    radius.card,
    padding:         spacing.md,
    gap:             spacing.xs,
  },
  correctAnswerBox: {
    backgroundColor: colors.successSoft,
    borderRadius:    radius.card,
    padding:         spacing.md,
    gap:             spacing.xs,
  },
  yourAnswerBox: {
    backgroundColor: colors.surface,
    borderRadius:    radius.card,
    padding:         spacing.md,
    gap:             spacing.xs,
    borderWidth:     1,
    borderColor:     colors.borderSubtle,
  },
  feedbackSectionLabel: {
    fontFamily:    font.semibold,
    fontSize:      fontSize.xs,
    color:         colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  explanationText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textBody,
  },
  correctAnswerText: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
    color:      colors.success,
  },
  feedbackQuestion: {
    fontFamily: font.semibold,
    fontSize:   fontSize.sm,
    color:      colors.textStrong,
    marginBottom: spacing.xs,
  },
  feedbackAnswerText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
  },
  correct:    { color: colors.success },
  incorrect:  { color: colors.error },
  // ─── Key takeaway / coaching ─────────────────────────────────────────────────
  quizKeyTakeawayCard: {
    backgroundColor: colors.brandSoft,
    borderLeftWidth: 4,
    borderLeftColor: colors.brand,
    borderRadius:    radius.card,
    padding:         spacing.md,
    marginBottom:    spacing.md,
    gap:             spacing.xs,
  },
  quizKeyTakeawayLabel: {
    fontFamily:    font.semibold,
    fontSize:      fontSize.xs,
    color:         colors.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quizKeyTakeawayText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textBody,
  },
  coachingCard: {
    backgroundColor: colors.brandSoft,
    borderWidth:     1,
    borderColor:     colors.brand + '40',
    borderRadius:    radius.card,
    padding:         spacing.md,
    marginBottom:    spacing.md,
    gap:             spacing.xs,
  },
  coachingLabel: {
    fontFamily:   font.semibold,
    fontSize:     fontSize.xs,
    color:        colors.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coachingText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textBody,
  },
  doneBtn: { marginTop: spacing.lg },
});
