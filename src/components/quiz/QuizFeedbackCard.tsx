import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { QuizFeedback } from '@learning/shared';
import { colors, font, fontSize, radius, shadow, spacing } from '@/theme';

/**
 * QuizFeedbackCard — ticket 069 A4, reordered + restyled ticket 072f.
 *
 * Single component used by both the mid-capstone per-question view and the
 * terminal results view so both always share the same block order.
 *
 * Reading order goes context → reason → (key takeaway, rendered once, after
 * all cards): question/answer first (recessive — reference, not the point),
 * then Explanation (plain, neutral). For a wrong answer, the correct answer
 * is a highlighted chip inside the question/answer block, directly beside
 * the wrong pick it corrects, instead of a standalone block.
 *
 * Correct:   Question + your answer (recessive) → Explanation
 * Incorrect: Question + your answer + correct-answer chip (recessive block) → Explanation
 */
export function QuizFeedbackCard({ fb }: { fb: QuizFeedback }) {
  return (
    <View testID={`feedback-card-${fb.quizId}`} style={styles.feedbackWrapper}>
      {/* 1. Question + your answer (+ the correct-answer chip when wrong) — reference, recessive */}
      <View style={styles.answerRefBox}>
        <Text style={styles.feedbackQuestion}>{fb.question}</Text>
        {fb.isCorrect ? (
          <Text style={[styles.feedbackAnswerText, styles.correct]}>✓ Your answer: {fb.userAnswer}</Text>
        ) : (
          <Text style={[styles.feedbackAnswerText, styles.incorrect]}>✗ Your answer: {fb.userAnswer}</Text>
        )}
        {!fb.isCorrect && fb.correctAnswer != null && (
          <View style={styles.correctAnswerChip}>
            <Text style={styles.correctAnswerChipLabel}>Correct answer</Text>
            <Text style={styles.correctAnswerText}>{fb.correctAnswer}</Text>
          </View>
        )}
      </View>
      {/* 2. Explanation — plain, neutral */}
      <View style={styles.explanationBox}>
        <Text style={styles.feedbackSectionLabel}>Explanation</Text>
        <Text style={styles.explanationText}>{fb.explanation}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  feedbackWrapper: {
    gap:          spacing.sm,
    marginBottom: spacing.md,
  },
  // Question + your answer (+ correct answer if wrong) — the reference block.
  // Recessive on purpose: it's context, not the point.
  answerRefBox: {
    backgroundColor: colors.surfaceSunken,
    borderRadius:    radius.card,
    padding:         spacing.md,
    gap:             spacing.xs,
  },
  // Explanation — featured treatment: the user should read this carefully.
  // Bold brand-blue fill mirrors what Key Takeaway used to carry.
  explanationBox: {
    backgroundColor: colors.brand,
    borderRadius:    radius.card,
    padding:         spacing.md,
    gap:             spacing.xs,
    ...shadow.card,
  },
  // Correct-answer highlight, nested inside the (recessive) answerRefBox so
  // it still pops via colour even though its container is quiet.
  correctAnswerChip: {
    backgroundColor: colors.successSoft,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    borderRadius:    radius.sm,
    padding:         spacing.sm3,
    marginTop:       spacing.xs,
    gap:             2,
  },
  correctAnswerChipLabel: {
    fontFamily:    font.semibold,
    fontSize:      fontSize.xs,
    color:         colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  feedbackSectionLabel: {
    fontFamily:    font.semibold,
    fontSize:      fontSize.xs,
    color:         colors.textOnBrand,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity:       0.8,
  },
  explanationText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textOnBrand,
  },
  correctAnswerText: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
    color:      colors.success,
  },
  feedbackQuestion: {
    fontFamily:   font.medium,
    fontSize:     fontSize.sm,
    color:        colors.textMuted,
    marginBottom: spacing.xs,
  },
  feedbackAnswerText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
  },
  correct:   { color: colors.success },
  incorrect: { color: colors.error },
});
