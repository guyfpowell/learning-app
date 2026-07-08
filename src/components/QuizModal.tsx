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
import { useRouter } from 'expo-router';
import type { Lesson, QuizFeedback } from '@learning/shared';
import { useSubmitQuiz } from '@/hooks/useQuiz';
import { useSaveLesson, useUnsaveLesson } from '@/hooks/useLesson';
import { extractError } from '@/lib/errors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { colors, font, fontSize, radius, spacing } from '@/theme';

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

export function QuizModal({ visible, lesson, onClose }: QuizModalProps) {
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | undefined>(undefined);
  const [wrongAnswer, setWrongAnswer] = useState<string | undefined>(undefined);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
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

  function handleSkipRetake() {
    submit.mutate(
      { lessonId: lesson.id, answers: {}, skipRetake: true },
      { onError: handleQuizError }
    );
  }

  function handleNavigateAfterQuiz(nextId: string | null | undefined) {
    onClose();
    if (nextId) {
      router.replace(`/(tabs)/lesson/${nextId}` as never);
    } else {
      router.replace('/(tabs)/lessons' as never);
    }
  }

  // ─── Wrong first attempt — retake offer ───────────────────────────────────────
  if (submit.data && !submit.data.correct && submit.data.retakeAvailable) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <BookmarkButton saved={isSaved} onToggle={handleToggleSave} />
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close quiz results">
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.resultHeading}>Incorrect</Text>
            {lesson.keyTakeaway && <Text style={styles.keyTakeaway}>{lesson.keyTakeaway}</Text>}
            <Button label="Try again" onPress={handleTryAgain} style={styles.actionBtn} />
            <Button
              label="Next lesson"
              onPress={handleSkipRetake}
              loading={submit.isPending}
              style={styles.actionBtn}
            />
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
          <View style={styles.header}>
            <BookmarkButton saved={isSaved} onToggle={handleToggleSave} />
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close quiz results">
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.resultHeading}>{fb?.isCorrect ? 'Correct!' : 'Incorrect'}</Text>
            {fb && (
              <View
                style={[styles.feedbackCard, fb.isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect]}
                accessibilityRole="text"
              >
                <Text style={styles.feedbackQuestion}>{fb.question}</Text>
                <Text style={[styles.feedbackAnswer, fb.isCorrect ? styles.correct : styles.incorrect]}>
                  {fb.isCorrect ? '✓' : '✗'} Your answer: {fb.userAnswer}
                </Text>
                {!fb.isCorrect && fb.correctAnswer && (
                  <Text style={styles.correctAnswer}>Correct: {fb.correctAnswer}</Text>
                )}
                <Text style={styles.explanation}>{fb.explanation}</Text>
              </View>
            )}
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
    const { feedbacks, coaching, streak, milestone, trackAverage, previousAverage } = submit.data;
    const retakeUsed = wrongAnswer !== undefined;
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
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
                <Text style={styles.streakText}>🔥 {streak}-day streak</Text>
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

            {/* Key takeaway card */}
            {lesson.keyTakeaway && (
              <View testID="quiz-key-takeaway" style={styles.quizKeyTakeawayCard}>
                <Text style={styles.quizKeyTakeawayLabel}>KEY TAKEAWAY</Text>
                <Text style={styles.quizKeyTakeawayText}>{lesson.keyTakeaway}</Text>
              </View>
            )}

            {feedbacks.map((fb: QuizFeedback) => (
              <View
                key={fb.quizId}
                style={[styles.feedbackCard, fb.isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect]}
                accessibilityRole="text"
              >
                <Text style={styles.feedbackQuestion}>{fb.question}</Text>
                <Text style={[styles.feedbackAnswer, fb.isCorrect ? styles.correct : styles.incorrect]}>
                  {fb.isCorrect ? '✓' : '✗'} Your answer: {fb.userAnswer}
                </Text>
                {!fb.isCorrect && (
                  <Text style={styles.correctAnswer}>Correct: {fb.correctAnswer}</Text>
                )}
                <Text style={styles.explanation}>{fb.explanation}</Text>
              </View>
            ))}

            {coaching && (
              <View style={styles.coachingCard}>
                <Text style={styles.coachingLabel}>AI Coaching</Text>
                <Text style={styles.coachingText}>{coaching}</Text>
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
          <View style={styles.header}>
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
        <View style={styles.header}>
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
                  {current.options.map((option) => {
                    const isSelected = selectedAnswer === option;
                    const isDisabled = wrongAnswer === option;
                    return (
                      <Pressable
                        key={option}
                        style={[styles.option, isSelected && styles.optionSelected, isDisabled && styles.optionDisabled]}
                        onPress={() => !isDisabled && handleSelectOption(option)}
                        disabled={isDisabled}
                      >
                        <Text style={[styles.optionText, isSelected && styles.optionTextSelected, isDisabled && styles.optionTextDisabled]}>
                          {option}
                        </Text>
                      </Pressable>
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
  container:   { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop:        spacing.lg,
    paddingBottom:     spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  spacer:    { width: 32 },
  closeBtn:  { padding: spacing.xs },
  closeText: {
    fontFamily: font.bold,
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
    backgroundColor: colors.border,
    borderRadius:    3,
    overflow:        'hidden',
  },
  progressFill: {
    height:          6,
    backgroundColor: colors.teal,
    borderRadius:    3,
  },
  question: {
    fontFamily:   font.bold,
    fontSize:     fontSize.md,
    color:        colors.textDark,
    marginBottom: spacing.lg,
  },
  options:   { gap: spacing.sm, marginBottom: spacing.lg },
  option: {
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.btn,
    padding:         spacing.md,
    backgroundColor: colors.white,
  },
  optionSelected: {
    borderColor:     colors.teal,
    backgroundColor: colors.teal + '10',
  },
  optionText: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textDark,
  },
  optionTextSelected: { color: colors.teal },
  optionDisabled: { opacity: 0.4 },
  optionTextDisabled: { textDecorationLine: 'line-through' },
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
    color:        colors.textDark,
    textAlign:    'center',
    marginBottom: spacing.xl,
  },
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
  // Results
  resultHeading: {
    fontFamily:   font.bold,
    fontSize:     fontSize.xl,
    color:        colors.textDark,
    textAlign:    'center',
    marginTop:    spacing.lg,
    marginBottom: spacing.md,
  },
  scorePercent: {
    fontFamily:   font.bold,
    fontSize:     fontSize.xxl,
    color:        colors.teal,
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
    fontFamily: font.bold,
    fontSize:   fontSize.lg ?? fontSize.md,
  },
  trackAverageUp:   { color: colors.success },
  trackAverageDown: { color: colors.error },
  trackAverageFlat: { color: colors.success },
  feedbackCard: {
    backgroundColor: colors.white,
    borderRadius:    radius.card,
    padding:         spacing.md,
    marginBottom:    spacing.md,
    gap:             spacing.xs,
  },
  feedbackQuestion: {
    fontFamily: font.bold,
    fontSize:   fontSize.sm,
    color:      colors.textDark,
  },
  feedbackAnswer: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
  },
  correct:    { color: colors.success },
  incorrect:  { color: colors.error },
  correctAnswer: {
    fontFamily: font.bold,
    fontSize:   fontSize.base,
    color:      colors.success,
  },
  quizKeyTakeawayCard: {
    backgroundColor: colors.teal + '10',
    borderLeftWidth: 4,
    borderLeftColor: colors.teal,
    borderRadius:    radius.card,
    padding:         spacing.md,
    marginBottom:    spacing.md,
    gap:             spacing.xs,
  },
  quizKeyTakeawayLabel: {
    fontFamily:    font.bold,
    fontSize:      fontSize.xs,
    color:         colors.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quizKeyTakeawayText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textDark,
  },
  explanation: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
    fontStyle:  'italic',
  },
  doneBtn: { marginTop: spacing.lg },
  streakRow: {
    flexDirection:  'row',
    justifyContent: 'center',
    marginBottom:   spacing.md,
  },
  streakText: {
    fontFamily: font.bold,
    fontSize:   fontSize.base,
    color:      colors.textDark,
  },
  milestoneCard: {
    backgroundColor: '#f97316',
    borderRadius:    radius.card,
    padding:         spacing.md,
    marginBottom:    spacing.lg,
    alignItems:      'center',
  },
  milestoneText: {
    fontFamily: font.bold,
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
  feedbackCorrect: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  feedbackIncorrect: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  coachingCard: {
    backgroundColor: colors.teal + '10',
    borderWidth:     1,
    borderColor:     colors.teal + '40',
    borderRadius:    radius.card,
    padding:         spacing.md,
    marginBottom:    spacing.md,
    gap:             spacing.xs,
  },
  coachingLabel: {
    fontFamily:   font.bold,
    fontSize:     fontSize.xs,
    color:        colors.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coachingText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textDark,
  },
});
