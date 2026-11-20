import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  ACHIEVEMENTS_LOAD_ERROR,
  ALTITUDE_LOAD_ERROR,
  ALTITUDE_TITLE,
  heightChartPosition,
  type AchievementsResponse,
  type AltitudeResponse,
} from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { Spinner } from '@/components/ui/Spinner';
import { AltitudeChart } from '@/components/altitudeChart/AltitudeChart';
import { AltitudeHeader } from '@/components/altitudeChart/AltitudeHeader';
import { openingOffsetOf } from '@/components/altitudeChart/chartLayout';
import { headerLookFor, headerLookOf, headerSampleYOf } from '@/components/altitudeChart/chartStyles';
import { useAchievements } from '@/hooks/useAchievements';
import { useAltitude } from '@/hooks/useAltitude';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/store/auth.store';
import { colors, font, fontSize, spacing } from '@/theme';

/** What the screen draws: the load errors, the spinner, or the chart. A failed load is never drawn as a chart. */
type ChartLoad =
  | { kind: 'failed'; altitudeFailed: boolean; achievementsFailed: boolean }
  | { kind: 'loading' }
  | { kind: 'ready'; altitude: AltitudeResponse; achievements: AchievementsResponse };

/** The screen's state from its two queries; an error wins over any data a failed refetch kept. */
function chartLoadOf(
  altitude: Pick<UseQueryResult<AltitudeResponse>, 'data' | 'isError'>,
  achievements: Pick<UseQueryResult<AchievementsResponse>, 'data' | 'isError'>,
): ChartLoad {
  if (altitude.isError || achievements.isError) {
    return { kind: 'failed', altitudeFailed: altitude.isError, achievementsFailed: achievements.isError };
  }
  if (altitude.data === undefined || achievements.data === undefined) return { kind: 'loading' };
  return { kind: 'ready', altitude: altitude.data, achievements: achievements.data };
}

/** The Altitude chart (ADR-016: a detail screen in the root Stack): the learner's climb from sea level to space, opened from Home and the Progress tab. The chart scrolls under its own header, which takes the look of the band beneath it. */
export default function AltitudeScreen() {
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useProfile();
  const { height: viewportHeight } = useWindowDimensions();
  const { top: topInset } = useSafeAreaInsets();
  const altitudeQuery = useAltitude();
  const load = chartLoadOf(altitudeQuery, useAchievements());
  const [headerOnDark, setHeaderOnDark] = useState<boolean | null>(null);

  const altitude = altitudeQuery.data;
  const openingOffset = altitude ? openingOffsetOf(heightChartPosition(altitude.metres), viewportHeight) : 0;
  const onScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    setHeaderOnDark(headerLookOf(headerSampleYOf(nativeEvent.contentOffset.y, topInset)).onDark);
  };
  const headerLook = headerOnDark === null ? headerLookOf(headerSampleYOf(openingOffset, topInset)) : headerLookFor(headerOnDark);

  const errorStyle = [styles.error, { paddingTop: topInset + spacing.xxl }];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, title: ALTITUDE_TITLE }} />
      {load.kind === 'failed' && load.altitudeFailed && <Text testID="altitude-load-error" style={errorStyle}>{ALTITUDE_LOAD_ERROR}</Text>}
      {load.kind === 'failed' && load.achievementsFailed && <Text testID="achievements-load-error" style={errorStyle}>{ACHIEVEMENTS_LOAD_ERROR}</Text>}
      {load.kind === 'loading' && <Spinner fullScreen />}
      {load.kind === 'ready' && (
        <ScrollView
          testID="altitude-scroll"
          contentOffset={{ x: 0, y: openingOffset }}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          <AltitudeChart
            altitude={load.altitude}
            achievements={load.achievements}
            name={user?.name ?? ''}
            timezone={profile?.timezone}
            now={new Date()}
          />
        </ScrollView>
      )}
      <AltitudeHeader look={headerLook} topInset={topInset} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  error:     { padding: spacing.lg, fontFamily: font.regular, fontSize: fontSize.base, color: colors.error },
});
