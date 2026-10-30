import { StyleSheet, Text, View } from 'react-native';
import { colors, font, fontSize, spacing, tracking } from '@/theme';

interface QuizHeroCardProps {
  question: string;
  /** Set for a lesson with more than one question; a single-question lesson shows no progress. */
  progress?: { index: number; total: number };
}

/** The question view's lead: large text beside a cobalt bar, no box, with a capstone's progress above it (096). */
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
      ) : (
        <Text style={styles.eyebrow}>Question</Text>
      )}
      <Text style={styles.question}>{question}</Text>
    </View>
  );
}

/** Thickness of the cobalt bar beside the question, as on the key takeaway (096). */
const BAR_WIDTH = spacing.xs;

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: BAR_WIDTH,
    borderLeftColor: colors.brand,
    paddingLeft:     spacing.md,
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
  question: {
    fontFamily: font.displayMedium,
    fontSize:   fontSize.lg,
    lineHeight: fontSize.lg * 1.3,
    color:      colors.textStrong,
  },
});
