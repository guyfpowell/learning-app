import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { QuizModal } from '@/components/QuizModal';
import { useTodayLesson } from '@/hooks/useLesson';

const difficultyVariant = {
  beginner:     'success',
  intermediate: 'warning',
  advanced:     'error',
} as const;

export default function LessonsScreen() {
  const { data: lesson, isLoading, isError } = useTodayLesson();
  const [quizVisible, setQuizVisible] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Today's Lesson</Text>

        {isLoading && <Spinner fullScreen />}

        {isError && (
          <Text style={styles.error}>Unable to load lesson. Please try again.</Text>
        )}

        {!isLoading && !isError && lesson === null && (
          <Text style={styles.empty}>No lesson scheduled for today.</Text>
        )}

        {lesson && (
          <Card style={styles.card}>
            <Text style={styles.title}>{lesson.title}</Text>

            <View style={styles.meta}>
              <Badge
                label={lesson.difficulty}
                variant={difficultyVariant[lesson.difficulty]}
              />
              <Text style={styles.duration}>{lesson.durationMinutes} min</Text>
            </View>

            <Button
              label="Take Quiz"
              style={styles.quizBtn}
              onPress={() => setQuizVisible(true)}
            />
          </Card>
        )}
      </ScrollView>

      {lesson && (
        <QuizModal
          visible={quizVisible}
          lesson={lesson}
          onClose={() => setQuizVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: spacing.md, flexGrow: 1 },
  heading: {
    fontFamily: font.bold,
    fontSize:   fontSize.xl,
    color:      colors.textDark,
    marginBottom: spacing.lg,
  },
  card: { gap: spacing.md },
  title: {
    fontFamily: font.bold,
    fontSize:   fontSize.md,
    color:      colors.textDark,
  },
  meta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  duration: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  quizBtn: { marginTop: spacing.sm },
  error: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.error,
    textAlign:  'center',
    marginTop:  spacing.lg,
  },
  empty: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textMuted,
    textAlign:  'center',
    marginTop:  spacing.lg,
  },
});
