import { StyleSheet, Text, View } from 'react-native';
import { colors, font, fontSize, radius, shadow, spacing } from '@/theme';

interface QuizHeroCardProps {
  question: string;
  /** Set for a lesson with more than one question; a single-question lesson shows no progress. */
  progress?: { index: number; total: number };
}

/** The question view's hero: the question, and a capstone's progress, on cobalt (docs/app-styling.md §4). */
export function QuizHeroCard({ question, progress }: QuizHeroCardProps) {
  const percent = progress ? ((progress.index + 1) / progress.total) * 100 : 0;
  return (
    <View testID="quiz-hero-card" style={styles.card}>
      {progress && (
        <View style={styles.progressWrap}>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              Question {progress.index + 1} of {progress.total}
            </Text>
            <Text style={styles.progressText}>{Math.round(percent)}%</Text>
          </View>
          <View style={styles.track} testID="quiz-progress-bar">
            <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, percent))}%` as `${number}%` }]} />
          </View>
        </View>
      )}
      <Text style={styles.question}>{question}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.brand,
    borderRadius:    radius.card,
    padding:         spacing.lg,
    gap:             spacing.md,
    marginBottom:    spacing.lg,
    ...shadow.brand,
  },
  progressWrap: { gap: spacing.xs },
  progressRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
    color:      colors.brandSoft,
  },
  track: {
    height:          6,
    backgroundColor: colors.brandPress,
    borderRadius:    3,
    overflow:        'hidden',
  },
  fill: {
    height:          6,
    backgroundColor: colors.onBrand,
    borderRadius:    3,
  },
  question: {
    fontFamily: font.displayMedium,
    fontSize:   fontSize.lg,
    lineHeight: fontSize.lg * 1.3,
    color:      colors.onBrand,
  },
});
