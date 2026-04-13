import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Lesson, QuizFeedback } from '@learning/shared';
import { useSubmitQuiz } from '@/hooks/useQuiz';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, font, fontSize, radius, spacing } from '@/theme';

interface QuizModalProps {
  visible: boolean;
  lesson: Lesson;
  onClose: () => void;
}

export function QuizModal({ visible, lesson, onClose }: QuizModalProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const submit = useSubmitQuiz();
  const quizzes = lesson.quizzes;

  // Reset state each time the modal opens
  useEffect(() => {
    if (visible) {
      setQuestionIndex(0);
      setAnswers({});
      submit.reset();
    }
  }, [visible]);

  const current = quizzes[questionIndex];
  const isLast = questionIndex === quizzes.length - 1;
  const selectedAnswer = current ? answers[current.id] : undefined;

  function handleSelectOption(option: string) {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: option }));
  }

  function handleNext() {
    if (questionIndex < quizzes.length - 1) {
      setQuestionIndex((i) => i + 1);
    }
  }

  function handleSubmit() {
    submit.mutate({ lessonId: lesson.id, answers });
  }

  // ─── Results view ────────────────────────────────────────────────────────────
  if (submit.data) {
    const { score, feedbacks } = submit.data;
    const correct = feedbacks.filter((f: QuizFeedback) => f.isCorrect).length;
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
            <Text style={styles.resultHeading}>Quiz Complete!</Text>
            <Text style={styles.scorePercent}>{score}%</Text>
            <Text style={styles.scoreFraction}>{correct} of {feedbacks.length} correct</Text>

            {feedbacks.map((fb: QuizFeedback) => (
              <View key={fb.quizId} style={styles.feedbackCard}>
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

            <Button label="Done" onPress={onClose} style={styles.doneBtn} />
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
              <Text style={styles.progress}>
                Question {questionIndex + 1} of {quizzes.length}
              </Text>

              <Text style={styles.question}>{current.question}</Text>

              {current.type === 'multiple-choice' ? (
                <View style={styles.options}>
                  {current.options.map((option) => {
                    const isSelected = selectedAnswer === option;
                    return (
                      <Pressable
                        key={option}
                        style={[styles.option, isSelected && styles.optionSelected]}
                        onPress={() => handleSelectOption(option)}
                      >
                        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
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
                <Text style={styles.error}>Submission failed. Please try again.</Text>
              )}

              <Button
                label={isLast ? 'Submit' : 'Next'}
                onPress={isLast ? handleSubmit : handleNext}
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
  progress: {
    fontFamily:   font.medium,
    fontSize:     fontSize.sm,
    color:        colors.textMuted,
    marginBottom: spacing.md,
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
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  explanation: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
    fontStyle:  'italic',
  },
  doneBtn: { marginTop: spacing.lg },
});
