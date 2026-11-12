import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { colors, font, fontSize, spacing } from '@/theme';
import type { Quiz } from '@learning/shared';

const MARK = 22;

/** The right answer is a green disc with a tick; any other is an empty ring. */
function AnswerMark({ right }: { right: boolean }) {
  if (right) {
    return (
      <View style={[styles.mark, styles.markRight]}>
        <Icon name="check" size={13} color={colors.white} strokeWidth={3.2} />
      </View>
    );
  }
  return <View style={[styles.mark, styles.markWrong]} />;
}

/** One answer row, with the explanation under the right one. */
function AnswerRow({ testID, text, right, why }: { testID?: string; text: string; right: boolean; why?: string }) {
  return (
    <>
      <View testID={testID} style={styles.option}>
        <View style={styles.markBox}><AnswerMark right={right} /></View>
        <Text style={[styles.optionText, right && styles.optionRight]}>{text}</Text>
      </View>
      {right && !!why && (
        <View style={styles.why}>
          <Text style={styles.whyLabel}>WHY</Text>
          <Text style={styles.whyText}>{why}</Text>
        </View>
      )}
    </>
  );
}

/** A completed lesson's quiz, to read: each question with its right answer marked and the explanation. Nothing to answer or submit. */
export function QuizReview({ quizzes }: { quizzes: Quiz[] }) {
  if (quizzes.length === 0) {
    return <Text testID="quiz-review-empty" style={styles.empty}>This lesson has no quiz.</Text>;
  }

  return (
    <View testID="quiz-review" style={styles.list}>
      {quizzes.map((quiz, i) => (
        <View key={quiz.id} testID={`quiz-review-${quiz.id}`} style={styles.quiz}>
          <Text style={styles.question}>{`${i + 1}. ${quiz.question}`}</Text>

          <View>
            {quiz.type === 'multiple-choice' ? (
              quiz.options.map((option) => {
                const right = option === quiz.correctAnswer;
                return <AnswerRow key={option} testID={right ? `quiz-review-correct-${quiz.id}` : undefined} text={option} right={right} why={quiz.explanation} />;
              })
            ) : (
              <AnswerRow testID={`quiz-review-correct-${quiz.id}`} text={quiz.correctAnswer} right why={quiz.explanation} />
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list:        { gap: spacing.lg },
  quiz:        { gap: spacing.sm3 },
  question: {
    fontFamily:    font.extrabold,
    fontSize:      17,
    lineHeight:    17 * 1.28,
    letterSpacing: -0.015 * 17,
    color:         colors.textStrong,
  },
  option: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             spacing.sm3,
    paddingVertical: 7,
    borderTopWidth:  1,
    borderTopColor:  colors.border,
  },
  markBox:     { paddingTop: 1 },
  mark:        { width: MARK, height: MARK, borderRadius: MARK / 2, alignItems: 'center', justifyContent: 'center' },
  markRight:   { backgroundColor: colors.success },
  markWrong:   { borderWidth: 2, borderColor: colors.borderStrong },
  optionText:  { flex: 1, fontFamily: font.medium, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.35, color: colors.textMuted },
  optionRight: { fontFamily: font.extrabold, color: colors.textStrong },
  // The explanation sits under the right answer, in line with its text.
  why:         { gap: spacing.xs, paddingBottom: spacing.sm3, paddingLeft: MARK + spacing.sm3 },
  whyLabel:    { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 0.08 * 12, color: colors.textMuted },
  whyText:     { fontFamily: font.regular, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.45, color: colors.textBody },
  empty:       { fontFamily: font.regular, fontSize: fontSize.base, color: colors.textMuted },
});
