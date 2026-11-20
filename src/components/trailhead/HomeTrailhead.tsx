import React from 'react';
import { StyleSheet } from 'react-native';
import { ACHIEVEMENTS_LOAD_ERROR } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { useAchievements } from '@/hooks/useAchievements';
import { colors, font, fontSize } from '@/theme';
import { TrailheadCard } from './TrailheadCard';

/** Home's Trailhead: the card while it is unfinished. A failed load says so, never a missing card; a load in progress shows nothing. */
export function HomeTrailhead() {
  const { data, isError } = useAchievements();
  if (isError) return <Text testID="trailhead-load-error" style={styles.error}>{ACHIEVEMENTS_LOAD_ERROR}</Text>;
  return data ? <TrailheadCard trailhead={data.trailhead} /> : null;
}

const styles = StyleSheet.create({
  error: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.error, marginBottom: 16 },
});
