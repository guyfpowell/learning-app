import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Lesson } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { Icon } from '@/components/ui/Icon';
import { LessonRatingControl } from '@/components/ui/LessonRatingControl';
import { QuizResultFrame, type ResultFrameControls } from '@/components/quiz/QuizResultFrame';
import { nextLessonLabel } from '@/components/quiz/nextLessonLabel';
import { colors, font, press, spacing } from '@/theme';

/** No unresolved question left and no fresh result to show: the lesson's quiz is already done. */
export function AlreadyCompletedView({ frame, lesson, onNavigate }: {
  frame: ResultFrameControls;
  lesson: Pick<Lesson, 'id' | 'quizCompleted' | 'rating' | 'nextLessonId'>;
  /** The way on: the next lesson, or Home with none. */
  onNavigate: (nextLessonId: string | null | undefined) => void;
}) {
  return (
    <QuizResultFrame
      {...frame}
      rating={lesson.quizCompleted ? <LessonRatingControl lessonId={lesson.id} rating={lesson.rating ?? null} /> : undefined}
      action={
        <EdgeButton
          testID="result-action-btn"
          look={{ face: colors.brand, label: colors.white, edge: press.primaryEdge }}
          label={nextLessonLabel(lesson.nextLessonId)}
          icon="next"
          onPress={() => onNavigate(lesson.nextLessonId)}
        />
      }
    >
      <View style={styles.completedBlock}>
        <View style={styles.completedTile}>
          <Icon name="check" size={30} color={colors.textStrong} strokeWidth={2.6} />
        </View>
        <Text style={styles.resultHeading}>Already Completed</Text>
        <Text style={styles.completedBody}>You've already finished this lesson's quiz.</Text>
      </View>
    </QuizResultFrame>
  );
}

const styles = StyleSheet.create({
  // The message sits centred in the space above the pinned button.
  completedBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: spacing.lg, paddingBottom: 90 },
  completedTile:  { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  completedBody: {
    fontFamily: font.regular,
    fontSize:   17,
    lineHeight: 17 * 1.45,
    color:      colors.textBody,
    textAlign:  'center',
    maxWidth:   280,
  },
  resultHeading: {
    fontFamily:    font.black,
    fontSize:      32,
    lineHeight:    32 * 1.05,
    letterSpacing: -0.035 * 32,
    color:         colors.textStrong,
    textAlign:     'center',
  },
});
