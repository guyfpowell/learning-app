import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { ACHIEVEMENTS_LOAD_ERROR, ALTITUDE_LOAD_ERROR, ALTITUDE_TITLE, heightChartPosition } from '@learning/shared';
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

/** The Altitude chart (ADR-016: a detail screen in the root Stack): the learner's climb from sea level to space, opened from the Progress tab. The chart scrolls under its own header (123aj), which takes the look of the band beneath it. */
export default function AltitudeScreen() {
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useProfile();
  const { height: viewportHeight } = useWindowDimensions();
  const { top: topInset } = useSafeAreaInsets();
  const { data: altitude, isError: altitudeFailed } = useAltitude();
  const { data: achievements, isError: achievementsFailed } = useAchievements();
  const [headerOnDark, setHeaderOnDark] = useState<boolean | null>(null);

  const openingOffset = altitude ? openingOffsetOf(heightChartPosition(altitude.metres), viewportHeight) : 0;
  const onScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    setHeaderOnDark(headerLookOf(headerSampleYOf(nativeEvent.contentOffset.y, topInset)).onDark);
  };
  const headerLook = headerOnDark === null ? headerLookOf(headerSampleYOf(openingOffset, topInset)) : headerLookFor(headerOnDark);

  const errorStyle = [styles.error, { paddingTop: topInset + spacing.xxl }];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, title: ALTITUDE_TITLE }} />
      {altitudeFailed && <Text testID="altitude-load-error" style={errorStyle}>{ALTITUDE_LOAD_ERROR}</Text>}
      {achievementsFailed && <Text testID="achievements-load-error" style={errorStyle}>{ACHIEVEMENTS_LOAD_ERROR}</Text>}
      {!altitudeFailed && !achievementsFailed && !(altitude && achievements) && <Spinner fullScreen />}
      {!altitudeFailed && !achievementsFailed && altitude && achievements && (
        <ScrollView
          testID="altitude-scroll"
          contentOffset={{ x: 0, y: openingOffset }}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          <AltitudeChart
            altitude={altitude}
            achievements={achievements}
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
