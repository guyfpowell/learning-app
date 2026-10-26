import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { AchievementKey, Lesson, QuizFeedback } from '@learning/shared';
import { ACHIEVEMENTS_BY_KEY, ERROR_CODES } from '@learning/shared';
import * as Sentry from '@sentry/react-native';
import { useSubmitQuiz } from '@/hooks/useQuiz';
import { useSaveLesson, useUnsaveLesson } from '@/hooks/useLesson';
import { useRefreshPaths, useTopicFeedback } from '@/hooks/useTrack';
import { TopicFeedback } from '@/components/ui/TopicFeedback';
import { errorCode, extractError } from '@/lib/errors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LessonRatingControl } from '@/components/ui/LessonRatingControl';
import { QuizOpt } from '@/components/ui/QuizOpt';
import type { QuizOptState } from '@/components/ui/QuizOpt';
import { colors, font, fontSize, spacing } from '@/theme';
import { CelebrationOverlay, XpChipOverlay } from '@/components/ui/CelebrationOverlay';
import { QuizFeedbackCard } from '@/components/quiz/QuizFeedbackCard';
import { QuizResultFrame, quizFrameStyles } from '@/components/quiz/QuizResultFrame';
import { CoachingCard, KeyTakeawayCard, MilestoneCard, StreakRow, TrackAverageBadge, XpAward } from '@/components/quiz/QuizResultParts';
import { HOME_ROUTE, lessonRoute } from '@/lib/routes';

interface QuizModalProps {
  visible: boolean;
  /** Its `lessonRetakeInProgress` keeps a completed lesson mid-retake out of "Already Completed" (079e). */
  lesson: Lesson;
  onClose: () => void;
  /** Foreground seconds on the lesson flow so far (079e); sent with every submission. */
  completionTime?: () => number;
}

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <View style={styles.progressTrack} testID="quiz-progress-bar">
      <View style={[styles.progressFill, { width: `${clamped}%` as `${number}%` }]} />
    </View>
  );
}

type CelebrationItem =
  | { type: 'achievement'; id: string; name: string; description: string }
  | { type: 'xp'; id: string; amount: number };

export function QuizModal({ visible, lesson, onClose, completionTime }: QuizModalProps) {
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | undefined>(undefined);
  const [wrongAnswer, setWrongAnswer] = useState<string | undefined>(undefined);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [, setCelebrationQueue] = useState<CelebrationItem[]>([]);
  const [currentCelebration, setCurrentCelebration] = useState<CelebrationItem | null>(null);
  const [topicFeedbackClosed, setTopicFeedbackClosed] = useState(false);
  const celebrationFired = useRef(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const submit = useSubmitQuiz();
  const saveLesson = useSaveLesson();
  const unsaveLesson = useUnsaveLesson();
  const topicFeedback = useTopicFeedback();
  const refreshPaths = useRefreshPaths();
  const quizzes = lesson.quizzes;
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const milestoneAnim = useRef(new Animated.Value(0.8)).current;

  // Reset state each time the modal opens; resume from first unresolved question
  useEffect(() => {
    if (visible) {
      const resolved = new Set<string>(lesson.resolvedQuizIds ?? []);
      setResolvedIds(resolved);
      const allResolved = quizzes.length > 0 && quizzes.every(q => resolved.has(q.id));
      setAlreadyCompleted(quizzes.length > 0 && ((!!lesson.quizCompleted && !lesson.lessonRetakeInProgress) || allResolved));
      const startIdx = quizzes.findIndex(q => !resolved.has(q.id));
      setCurrentQuizIndex(startIdx === -1 ? 0 : startIdx);
      setSelectedAnswer(undefined);
      setWrongAnswer(undefined);
      setIsSaved(!!lesson.isSaved);
      submit.reset();
      scoreAnim.setValue(0);
      milestoneAnim.setValue(0.8);
      setCelebrationQueue([]);
      setCurrentCelebration(null);
      setTopicFeedbackClosed(false);
      celebrationFired.current = false;
    }
  }, [visible, lesson.id, lesson.isSaved]);

  function handleToggleSave() {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    const onError = (err: unknown) => {
      Sentry.addBreadcrumb({
        category: 'lesson',
        message: 'Save toggle failed; reverted',
        level: 'warning',
        data: { err: String(err), saved: nextSaved },
      });
      setIsSaved(!nextSaved);
    };
    (nextSaved ? saveLesson : unsaveLesson).mutate(lesson.id, { onError });
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

  // Build celebration queue on finalization — fires exactly once per quiz session
  useEffect(() => {
    if (!submit.data?.lessonFinalized || celebrationFired.current) return;
    celebrationFired.current = true;
    const items: CelebrationItem[] = [];
    const unlocked: AchievementKey[] = submit.data.achievementsUnlocked ?? [];
    for (const key of unlocked) {
      const def = ACHIEVEMENTS_BY_KEY[key];
      if (def) items.push({ type: 'achievement', id: key, name: def.name, description: def.description });
    }
    if (submit.data.xpAwarded != null && submit.data.xpAwarded > 0) {
      items.push({ type: 'xp', id: 'xp-award', amount: submit.data.xpAwarded });
    }
    if (items.length > 0) {
      setCurrentCelebration(items[0]);
      setCelebrationQueue(items.slice(1));
    }
  }, [submit.data]);

  function advanceCelebration() {
    setCelebrationQueue(q => {
      if (q.length > 0) {
        setCurrentCelebration(q[0]);
        return q.slice(1);
      }
      setCurrentCelebration(null);
      return [];
    });
  }

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

  // An already-answered question advances instead of erroring; anything else shows `submit-error`.
  function handleQuizError(error: unknown) {
    if (errorCode(error) === ERROR_CODES.LESSON_ALREADY_COMPLETED) {
      advanceToNextUnresolved(current?.id);
    }
  }

  function handleSubmit() {
    if (!current || !selectedAnswer) return;
    const answers: Record<string, string> = { [current.id]: selectedAnswer };
    submit.mutate(
      {
        lessonId: lesson.id,
        answers,
        ...(wrongAnswer !== undefined ? { isRetake: true } : {}),
        ...(completionTime ? { completionTime: completionTime() } : {}),
      },
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
      router.replace(lessonRoute(nextId));
    } else {
      router.replace(HOME_ROUTE);
    }
  }

  const frame = { visible, onClose, saved: isSaved, onToggleSave: handleToggleSave };

  // ─── Wrong first attempt — retry offer ("Try again") ─────────────────────────
  if (submit.data && !submit.data.correct && submit.data.retakeAvailable) {
    return (
      <QuizResultFrame {...frame}>
        <Text style={styles.resultHeading}>Incorrect</Text>
        {lesson.keyTakeaway && <Text style={styles.keyTakeaway}>{lesson.keyTakeaway}</Text>}
        <Button label="Try again" onPress={handleTryAgain} style={styles.actionBtn} />
      </QuizResultFrame>
    );
  }

  // ─── Per-question feedback — mid-capstone, lesson not yet finalized ───────────
  if (submit.data && !submit.data.lessonFinalized) {
    const fb = submit.data.feedbacks.find((f: QuizFeedback) => f.quizId === current?.id) ?? submit.data.feedbacks[0];
    return (
      <QuizResultFrame {...frame}>
        <Text style={styles.resultHeading}>{fb?.isCorrect ? 'Correct!' : 'Incorrect'}</Text>
        {fb && <QuizFeedbackCard fb={fb} />}
        <Button
          label="Next Question"
          onPress={() => advanceToNextUnresolved(current?.id)}
          style={styles.actionBtn}
          accessibilityLabel="Next question"
        />
      </QuizResultFrame>
    );
  }

  // ─── Terminal / results view — lesson finalized ───────────────────────────────
  if (submit.data) {
    const { feedbacks, coaching, streak, milestone, trackAverage, previousAverage, xpAwarded, nextLessonId } = submit.data;
    const retakeUsed = wrongAnswer !== undefined;
    const topicEnd = topicFeedbackClosed ? null : submit.data.topicEnd;
    const celebration = (
      <>
        {currentCelebration?.type === 'achievement' && (
          <CelebrationOverlay
            key={currentCelebration.id}
            visible
            title="Achievement Earned!"
            name={currentCelebration.name}
            description={currentCelebration.description}
            onDismiss={advanceCelebration}
          />
        )}
        {currentCelebration?.type === 'xp' && (
          <XpChipOverlay key={currentCelebration.id} visible xp={currentCelebration.amount} onDismiss={advanceCelebration} />
        )}
      </>
    );
    return (
      <QuizResultFrame {...frame} overlay={celebration}>
        <Text style={styles.resultHeading}>{submit.data.correct ? 'Correct!' : 'Incorrect'}</Text>
        <Animated.View style={{ transform: [{ scale: scoreAnim }] }}>
          <TrackAverageBadge average={trackAverage} previous={previousAverage} retakeUsed={retakeUsed} />
        </Animated.View>
        {streak > 0 && <StreakRow streak={streak} />}
        {xpAwarded != null && xpAwarded > 0 && <XpAward xp={xpAwarded} />}
        {milestone && <MilestoneCard milestone={milestone} streak={streak} scale={milestoneAnim} />}
        {/* Feedback cards — one per quiz question */}
        {feedbacks.map((fb: QuizFeedback) => <QuizFeedbackCard key={fb.quizId} fb={fb} />)}
        {coaching && <CoachingCard coaching={coaching} />}
        {/* Key takeaway — last, per item 6 */}
        {lesson.keyTakeaway && <KeyTakeawayCard takeaway={lesson.keyTakeaway} />}
        {/* 079f: the result's lesson carries the stored verdict, so no refetch. */}
        <LessonRatingControl lessonId={lesson.id} rating={submit.data.lesson.rating ?? null} />
        {/* End-of-topic feedback (079d). Closing hides it here only: the write already
            happened, so Home will not show it again; one never written comes back on Home. */}
        {topicEnd && (
          <TopicFeedback
            topicEnd={topicEnd}
            onSubmit={body => topicFeedback.submit(topicEnd.planId, body)}
            onClose={() => { setTopicFeedbackClosed(true); refreshPaths(); }}
          />
        )}
        <Button
          label={nextLessonId ? 'Next Lesson' : 'Back to Dashboard'}
          onPress={() => handleNavigateAfterQuiz(nextLessonId)}
          style={styles.doneBtn}
        />
      </QuizResultFrame>
    );
  }

  // ─── Already completed — no unresolved question left, and no fresh result to show ──
  if (alreadyCompleted) {
    return (
      <QuizResultFrame {...frame}>
        <Text style={styles.resultHeading}>Already Completed</Text>
        <Text style={styles.completedBody}>You've already finished this lesson's quiz.</Text>
        {lesson.quizCompleted && <LessonRatingControl lessonId={lesson.id} rating={lesson.rating ?? null} />}
        <Button
          label={lesson.nextLessonId ? 'Next Lesson' : 'Back to Dashboard'}
          onPress={() => handleNavigateAfterQuiz(lesson.nextLessonId)}
          style={styles.doneBtn}
        />
      </QuizResultFrame>
    );
  }

  // ─── Quiz view ───────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* The question view has no bookmark: the spacer keeps the close button right-aligned. */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
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
  ...quizFrameStyles,
  spacer:    { width: 32 },
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
  resultHeading: {
    fontFamily:   font.semibold,
    fontSize:     fontSize.xl,
    color:        colors.textStrong,
    textAlign:    'center',
    marginTop:    spacing.lg,
    marginBottom: spacing.md,
  },
  doneBtn: { marginTop: spacing.lg },
});
