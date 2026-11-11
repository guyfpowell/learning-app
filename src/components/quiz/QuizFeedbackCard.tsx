import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import type { QuizFeedback } from '@learning/shared';
import { font, fontSize, results, spacing } from '@/theme';
import { AnswerRow, WhySection } from '@/components/quiz/ResultSections';
import type { ResultTone } from '@/components/quiz/resultTone';

/**
 * One question's result on the verdict colour: your answer, the answer when you were wrong,
 * then Why. The mid-capstone view and the final view share it, so both read the same.
 *
 * Correct:   Your answer (ticked) → Why
 * Incorrect: Your answer (struck through, red) → The answer (white tick) → Why
 *
 * `showQuestion` puts the question above the answers, for a capstone result that lists several.
 */
export function QuizFeedbackCard({ fb, tone, showQuestion = false }: { fb: QuizFeedback; tone: ResultTone; showQuestion?: boolean }) {
  return (
    <View testID={`feedback-card-${fb.quizId}`} style={styles.wrapper}>
      {showQuestion && <Text style={[styles.question, { color: results[tone].tint }]}>{fb.question}</Text>}
      {fb.isCorrect ? (
        <AnswerRow tone={tone} label="YOUR ANSWER" answer={fb.userAnswer} mark="right" />
      ) : (
        <>
          <AnswerRow tone={tone} label="YOUR ANSWER" answer={fb.userAnswer} mark="wrong" struck />
          {fb.correctAnswer != null && <AnswerRow tone={tone} label="THE ANSWER" answer={fb.correctAnswer} mark="right" />}
        </>
      )}
      <WhySection tone={tone} text={fb.explanation} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:  { marginBottom: spacing.lg },
  question: { fontFamily: font.medium, fontSize: fontSize.sm, marginBottom: spacing.sm3 },
});
