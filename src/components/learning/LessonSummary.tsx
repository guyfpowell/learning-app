import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Spinner } from '@/components/ui/Spinner';
import { useLesson } from '@/hooks/useLesson';
import { extractError } from '@/lib/errors';
import { colors, font, fontSize, spacing } from '@/theme';
import type { TrackContentsLesson } from '@learning/shared';

const STATUS_CAPTION: Record<TrackContentsLesson['status'], string> = {
  complete:      'Completed',
  'in-progress': 'In progress',
  skipped:       'Skipped',
  'not-started': 'Not started yet',
};

/** A lesson the learner has not completed, as a summary only: nothing here starts it. */
export function LessonSummary({ lesson }: { lesson: TrackContentsLesson }) {
  const { data, isLoading, isError, error } = useLesson(lesson.id);

  if (isLoading) return <View testID="lesson-summary-loading" style={styles.centred}><Spinner /></View>;
  if (isError || !data) return <Text style={styles.error}>{extractError(error)}</Text>;

  return (
    <View testID="lesson-summary">
      <Text style={styles.status}>{STATUS_CAPTION[lesson.status]}</Text>
      {data.summary
        ? <Text style={styles.summary}>{data.summary}</Text>
        : <Text testID="lesson-summary-empty" style={styles.empty}>There is no summary for this lesson yet.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  centred: { alignItems: 'center', padding: spacing.lg },
  status:  { fontFamily: font.medium, fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.md },
  summary: { fontFamily: font.regular, fontSize: fontSize.md, lineHeight: fontSize.md * 1.5, color: colors.textBody },
  empty:   { fontFamily: font.regular, fontSize: fontSize.base, color: colors.textMuted },
  error:   { fontFamily: font.regular, fontSize: fontSize.base, color: colors.error },
});
