import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { KeyTakeawayBlock } from '@/components/ui/KeyTakeawayBlock';
import { TabBar } from '@/components/ui/TabBar';
import { LessonReading } from '@/components/learning/LessonReading';
import { QuizReview } from '@/components/learning/QuizReview';
import { colors, font, fontSize, spacing } from '@/theme';
import { LESSON_COMPLETED_BANNER, RETAKE_START_ERROR, type Lesson } from '@learning/shared';

type ViewTab = 'summary' | 'lesson' | 'quiz';

const TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'lesson', label: 'Lesson' },
  { key: 'quiz', label: 'Quiz' },
] as const satisfies readonly { key: ViewTab; label: string }[];

interface CompletedLessonViewProps {
  lesson: Lesson;
  onRetake: () => void;
  retaking: boolean;
  retakeFailed: boolean;
}

/**
 * A lesson the learner has completed, to look back over: its summary, the full lesson and its
 * quiz, one tap apart in any order. Nothing here submits an answer; only Retake lesson starts a new pass.
 */
export function CompletedLessonView({ lesson, onRetake, retaking, retakeFailed }: CompletedLessonViewProps) {
  const [tab, setTab] = useState<ViewTab>('summary');

  return (
    <View testID="completed-lesson-view" style={styles.view}>
      <TabBar tabs={TABS} selected={tab} onSelect={setTab} testIDPrefix="lesson-tab" />

      {tab === 'summary' && (
        <View testID="lesson-tab-panel-summary" style={styles.panel}>
          <View testID="lesson-completed-banner" style={styles.banner}>
            <Text style={styles.bannerText}>{LESSON_COMPLETED_BANNER}</Text>
          </View>
          {!!lesson.summary && <Text testID="lesson-summary-text" style={styles.summary}>{lesson.summary}</Text>}
          {!!lesson.keyTakeaway && <KeyTakeawayBlock testID="key-takeaway" takeaway={lesson.keyTakeaway} />}
          <Button
            testID="lesson-retake-btn"
            label="Retake lesson"
            variant="secondary"
            loading={retaking}
            onPress={onRetake}
          />
          {retakeFailed && <Text testID="retake-error" style={styles.error}>{RETAKE_START_ERROR}</Text>}
        </View>
      )}

      {tab === 'lesson' && (
        <View testID="lesson-tab-panel-lesson" style={styles.panel}>
          <LessonReading content={lesson.content} mediaUrl={lesson.mediaUrl} />
        </View>
      )}

      {tab === 'quiz' && (
        <View testID="lesson-tab-panel-quiz" style={styles.panel}>
          <QuizReview quizzes={lesson.quizzes} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  view:    { gap: spacing.md },
  panel:   { gap: spacing.md },
  banner:  { backgroundColor: colors.successSoft, borderRadius: 8, padding: spacing.sm, alignItems: 'center' },
  bannerText: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.success },
  summary: { fontFamily: font.regular, fontSize: fontSize.md, lineHeight: fontSize.md * 1.5, color: colors.textBody },
  error:   { fontFamily: font.regular, fontSize: fontSize.base, color: colors.error },
});
