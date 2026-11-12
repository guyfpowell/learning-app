import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Spinner } from '@/components/ui/Spinner';
import { LessonStatusLine } from '@/components/learning/LessonStatusLine';
import type { StepStatus } from '@/components/learning/TrackSteps';
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

const STATUS_BOX: Record<TrackContentsLesson['status'], StepStatus> = {
  complete:      'done',
  'in-progress': 'started',
  skipped:       'skipped',
  'not-started': 'todo',
};

/** A lesson the learner has not completed, as a summary only: nothing here starts it. */
export function LessonSummary({ lesson, color, action }: { lesson: TrackContentsLesson; color: string; action?: ReactNode }) {
  const { data, isLoading, isError, error } = useLesson(lesson.id);

  return (
    <View>
      <View style={styles.head}>
        <LessonStatusLine status={STATUS_BOX[lesson.status]} color={color} text={STATUS_CAPTION[lesson.status]} testID="lesson-summary-status" />
        <Text testID="track-detail-subheading" style={styles.title}>{lesson.title}</Text>
      </View>
      {isLoading && <View testID="lesson-summary-loading" style={styles.centred}><Spinner /></View>}
      {!isLoading && (isError || !data) && <Text style={styles.error}>{extractError(error)}</Text>}
      {!isLoading && !isError && !!data && (
        <View testID="lesson-summary" style={styles.body}>
          {data.summary
            ? <Text style={styles.summary}>{data.summary}</Text>
            : <Text testID="lesson-summary-empty" style={styles.empty}>There is no summary for this lesson yet.</Text>}
        </View>
      )}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  centred: { alignItems: 'center', padding: spacing.lg },
  head:    { gap: 10, marginBottom: spacing.md },
  title: {
    fontFamily:    font.black,
    fontSize:      26,
    lineHeight:    26 * 1.08,
    letterSpacing: -0.035 * 26,
    color:         colors.textStrong,
  },
  action:  { marginTop: spacing.lg },
  body:    { paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.border },
  summary: { fontFamily: font.regular, fontSize: 17, lineHeight: 17 * 1.6, color: colors.textBody },
  empty:   { fontFamily: font.regular, fontSize: fontSize.base, color: colors.textMuted },
  error:   { fontFamily: font.regular, fontSize: fontSize.base, color: colors.error },
});
