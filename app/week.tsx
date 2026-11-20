import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { WEEK_LOAD_ERROR, WEEK_TITLE } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { Spinner } from '@/components/ui/Spinner';
import { WeekSummaryView } from '@/components/week/WeekSummaryView';
import { useDetailHeader } from '@/hooks/useDetailHeader';
import { useGoBack } from '@/hooks/useGoBack';
import { useProfile } from '@/hooks/useProfile';
import { useWeek } from '@/hooks/useWeek';
import { HOME_ROUTE } from '@/lib/routes';
import { colors, font, fontSize, spacing } from '@/theme';

/** "The week" (ADR-016: a detail screen in the root Stack): what the learner climbed and earned this week. Opened from the Sunday recap push and from the Progress tab. */
export default function WeekScreen() {
  const header = useDetailHeader(WEEK_TITLE);
  const goBack = useGoBack(HOME_ROUTE);
  const { data, isError } = useWeek();
  const { data: profile } = useProfile();

  // A failed refetch keeps the last data, so the error is checked first.
  const week = isError ? undefined : data;

  return (
    <View style={styles.container}>
      <Stack.Screen options={header} />
      {isError && <Text testID="week-load-error" style={styles.error}>{WEEK_LOAD_ERROR}</Text>}
      {!isError && !week && <Spinner fullScreen />}
      {week && <WeekSummaryView week={week} timezone={profile?.timezone} onDone={goBack} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  error:     { padding: spacing.lg, fontFamily: font.regular, fontSize: fontSize.base, color: colors.error },
});
