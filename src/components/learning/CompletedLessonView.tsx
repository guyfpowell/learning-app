import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { WordTabs } from '@/components/ui/WordTabs';
import { LessonReading } from '@/components/learning/LessonReading';
import { QuizReview } from '@/components/learning/QuizReview';
import { colors, font, levelCard, spacing } from '@/theme';
import type { Lesson } from '@learning/shared';

type ViewTab = 'summary' | 'lesson' | 'quiz';

const TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'lesson', label: 'Lesson' },
  { key: 'quiz', label: 'Quiz' },
] as const satisfies readonly { key: ViewTab; label: string }[];

/**
 * A lesson the learner has completed, to look back over: its summary, the full lesson and its
 * quiz, one tap apart in any order. Nothing here submits an answer or starts a retake.
 */
export function CompletedLessonView({ lesson }: { lesson: Lesson }) {
  const [tab, setTab] = useState<ViewTab>('summary');
  const color = levelCard[lesson.skillPath?.level ?? 'intermediate'].base;

  return (
    <View testID="completed-lesson-view" style={styles.view}>
      <WordTabs tabs={TABS} selected={tab} onSelect={setTab} color={color} testIDPrefix="lesson-tab" />

      {tab === 'summary' && (
        <View testID="lesson-tab-panel-summary" style={styles.panel}>
          {!!lesson.summary && <Text testID="lesson-summary-text" style={styles.summary}>{lesson.summary}</Text>}
          {!!lesson.keyTakeaway && (
            <View style={styles.takeaway}>
              <Text style={[styles.takeawayLabel, { color }]}>KEY TAKEAWAY</Text>
              <Text testID="key-takeaway" style={styles.takeawayText}>{lesson.keyTakeaway}</Text>
            </View>
          )}
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
  view:    { gap: spacing.lg },
  panel:   { gap: 22 },
  summary: { fontFamily: font.regular, fontSize: 17, lineHeight: 17 * 1.6, color: colors.textBody },
  takeaway: { gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  takeawayLabel: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 0.1 * 12 },
  takeawayText: { fontFamily: font.extrabold, fontSize: 22, lineHeight: 22 * 1.22, letterSpacing: -0.025 * 22, color: colors.textStrong },
});
