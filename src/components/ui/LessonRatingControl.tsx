import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { LESSON_RATINGS, LESSON_RATING_LABELS, nextLessonRating, type LessonRating } from '@learning/shared';
import { useSetLessonRating } from '@/hooks/useLesson';
import { colors, spacing } from '@/theme';

interface LessonRatingControlProps {
  lessonId: string;
  /** The stored verdict from the server. */
  rating: LessonRating | null;
}

const ICON: Record<LessonRating, { on: 'thumbs-up' | 'thumbs-down'; off: 'thumbs-up-outline' | 'thumbs-down-outline' }> = {
  up: { on: 'thumbs-up', off: 'thumbs-up-outline' },
  down: { on: 'thumbs-down', off: 'thumbs-down-outline' },
};

/** Thumbs on a completed lesson. Tapping the selected thumb clears it; the other replaces it. */
export function LessonRatingControl({ lessonId, rating }: LessonRatingControlProps) {
  const [current, setCurrent] = useState<LessonRating | null>(rating);
  const setRating = useSetLessonRating();

  useEffect(() => { setCurrent(rating); }, [lessonId, rating]);

  function pick(picked: LessonRating) {
    if (setRating.isPending) return;
    const previous = current;
    const next = nextLessonRating(current, picked);
    setCurrent(next);
    setRating.mutate({ lessonId, rating: next }, {
      onError: (err) => {
        Sentry.addBreadcrumb({ category: 'lesson', message: 'Rating save failed; reverted', level: 'warning', data: { err: String(err) } });
        setCurrent(previous);
      },
    });
  }

  return (
    <View testID="lesson-rating" style={styles.row} accessibilityRole="radiogroup">
      {LESSON_RATINGS.map((r) => {
        const selected = current === r;
        return (
          <Pressable
            key={r}
            onPress={() => pick(r)}
            accessibilityRole="button"
            accessibilityLabel={LESSON_RATING_LABELS[r]}
            accessibilityState={{ selected }}
            style={styles.button}
          >
            <Ionicons name={selected ? ICON[r].on : ICON[r].off} size={22} color={selected ? colors.teal : colors.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  button: { padding: spacing.xs },
});
