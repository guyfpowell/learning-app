import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { LessonSummary } from '@learning/shared';
import { colors, font, fontSize, radius, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useProgress } from '@/hooks/useProgress';
import { useSavedLessons } from '@/hooks/useLesson';

function SavedLessonRow({ lesson }: { lesson: LessonSummary }) {
  return (
    <Card testID="saved-lesson-row" style={styles.savedRow}>
      <Text style={styles.savedTitle}>{lesson.title}</Text>
      <Text style={styles.savedMeta}>
        {[lesson.topicName, lesson.skillName].filter(Boolean).join(' · ')}
      </Text>
    </Card>
  );
}

export default function ProgressScreen() {
  const { data, isLoading, isError } = useProgress();
  const { data: savedLessons } = useSavedLessons();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>My Progress</Text>

        {isLoading && <Spinner fullScreen />}

        {isError && (
          <Text style={styles.error}>Unable to load progress. Please try again.</Text>
        )}

        {!isLoading && !isError && data === null && (
          <Text style={styles.empty}>No progress data available.</Text>
        )}

        {data && (
          <>
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Text testID="progress-streak" style={styles.statValue}>{data.currentStreak}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </Card>

              <Card style={styles.statCard}>
                <Text testID="progress-lessons-count" style={styles.statValue}>{data.totalLessonsCompleted}</Text>
                <Text style={styles.statLabel}>Lessons Done</Text>
              </Card>

              <Card style={styles.statCard}>
                <Text testID="progress-avg-score" style={styles.statValue}>{data.averageScore}%</Text>
                <Text style={styles.statLabel}>Avg Score</Text>
              </Card>
            </View>

            {data.lastLessonDate && (
              <Card style={styles.dateCard}>
                <Text style={styles.dateLabel}>
                  Last lesson: {new Date(data.lastLessonDate).toLocaleDateString()}
                </Text>
              </Card>
            )}
          </>
        )}

        <Text style={styles.sectionHeading}>Saved</Text>
        {savedLessons && savedLessons.length > 0 ? (
          <View style={styles.savedList}>
            {savedLessons.map((lesson) => (
              <SavedLessonRow key={lesson.id} lesson={lesson} />
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>No saved lessons yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: spacing.md, flexGrow: 1 },
  heading: {
    fontFamily:   font.bold,
    fontSize:     fontSize.xl,
    color:        colors.textDark,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginBottom:  spacing.md,
  },
  statCard: {
    flex:       1,
    alignItems: 'center',
    gap:        spacing.xs,
  },
  statValue: {
    fontFamily: font.bold,
    fontSize:   fontSize.xl,
    color:      colors.teal,
  },
  statLabel: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
    textAlign:  'center',
  },
  dateCard: { marginTop: spacing.sm },
  dateLabel: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  sectionHeading: {
    fontFamily:   font.bold,
    fontSize:     fontSize.sm,
    color:        colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop:    spacing.lg,
    marginBottom: spacing.sm,
  },
  savedList: { gap: spacing.sm },
  savedRow: { gap: spacing.xs, borderRadius: radius.card },
  savedTitle: {
    fontFamily: font.bold,
    fontSize:   fontSize.base,
    color:      colors.textDark,
  },
  savedMeta: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },
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
