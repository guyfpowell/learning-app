import { StyleSheet, Text, View } from 'react-native';
import { colors, font, fontSize, spacing, tracking } from '@/theme';
import { FittedText } from '@/components/ui/FittedText';
import type { SizeRange } from '@/lib/fitTakeaway';

interface QuizHeroCardProps {
  question: string;
  /** Set for a lesson with more than one question; a single-question lesson shows no progress. */
  progress?: { index: number; total: number };
}

/** The question view's lead: large fitted text, no bar, no box, with a capstone's progress above it (096). A single question has no label. */
export function QuizHeroCard({ question, progress }: QuizHeroCardProps) {
  const percent = progress ? ((progress.index + 1) / progress.total) * 100 : 0;
  return (
    <View testID="quiz-hero-card" style={styles.card}>
      {progress ? (
        <View style={styles.progressWrap}>
          <View style={styles.progressRow}>
            <Text style={styles.eyebrow}>
              Question {progress.index + 1} of {progress.total}
            </Text>
            <Text style={styles.progressText}>{Math.round(percent)}%</Text>
          </View>
          <View style={styles.track} testID="quiz-progress-bar">
            <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, percent))}%` as `${number}%` }]} />
          </View>
        </View>
      ) : null}
      <FittedText text={question} testID="quiz-question" fontFamily={font.displayMedium} lineHeight={QUESTION_LINE_HEIGHT} range={QUESTION_RANGE} />
    </View>
  );
}

const QUESTION_LINE_HEIGHT = 1.3;
/** The question has more room than the takeaway, so it may go a little larger: 20 to 26pt (no 20 or 26 token) (096). */
export const QUESTION_RANGE: SizeRange = { min: fontSize.md + 2, max: fontSize.lg + 4 };

const styles = StyleSheet.create({
  card: {
    gap:             spacing.sm,
    marginBottom:    spacing.lg,
  },
  eyebrow: {
    fontFamily:    font.bold,
    fontSize:      fontSize.xs,
    letterSpacing: tracking.caps,
    textTransform: 'uppercase',
    color:         colors.brand,
  },
  progressWrap: { gap: spacing.xs },
  progressRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  track: {
    height:          6,
    backgroundColor: colors.borderSubtle,
    borderRadius:    3,
    overflow:        'hidden',
  },
  fill: {
    height:          6,
    backgroundColor: colors.brand,
    borderRadius:    3,
  },
});
