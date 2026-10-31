import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { colors, font, fontSize, spacing } from '@/theme';
import type { Quiz } from '@learning/shared';

/** A completed lesson's quiz, to read: each question with its right answer marked and the explanation. Nothing to answer or submit. */
export function QuizReview({ quizzes }: { quizzes: Quiz[] }) {
  if (quizzes.length === 0) {
    return <Text testID="quiz-review-empty" style={styles.empty}>This lesson has no quiz.</Text>;
  }

  return (
    <View testID="quiz-review" style={styles.list}>
      {quizzes.map((quiz, i) => (
        <Card key={quiz.id} testID={`quiz-review-${quiz.id}`} padding={spacing.md} style={styles.card}>
          <Text style={styles.question}>{`${i + 1}. ${quiz.question}`}</Text>

          {quiz.type === 'multiple-choice' ? (
            quiz.options.map((option) => {
              const right = option === quiz.correctAnswer;
              return (
                <View key={option} testID={right ? `quiz-review-correct-${quiz.id}` : undefined} style={styles.option}>
                  <Ionicons
                    name={right ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={right ? colors.success : colors.textSubtle}
                  />
                  <Text style={[styles.optionText, right && styles.optionRight]}>{option}</Text>
                </View>
              );
            })
          ) : (
            <View testID={`quiz-review-correct-${quiz.id}`} style={styles.option}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[styles.optionText, styles.optionRight]}>{quiz.correctAnswer}</Text>
            </View>
          )}

          {!!quiz.explanation && <Text style={styles.explanation}>{quiz.explanation}</Text>}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list:        { gap: spacing.md },
  card:        { gap: spacing.sm },
  question:    { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.textStrong, lineHeight: fontSize.base * 1.4 },
  option:      { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  optionText:  { flex: 1, fontFamily: font.regular, fontSize: fontSize.base, color: colors.textBody },
  optionRight: { fontFamily: font.semibold, color: colors.success },
  explanation: {
    fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted, lineHeight: fontSize.sm * 1.5,
    marginTop: spacing.xs, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  empty:       { fontFamily: font.regular, fontSize: fontSize.base, color: colors.textMuted },
});
