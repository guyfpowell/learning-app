import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { WEEK_TITLE, metresClimbedCopy } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { useWeek } from '@/hooks/useWeek';
import { WEEK_ROUTE } from '@/lib/routes';
import { colors, font, fontSize, radius, spacing } from '@/theme';

const CHEVRON_SIZE = 18;

/** The way into the week just gone: a soft gold card of its own (so it is not read as part of the all-time numbers), with the metres climbed straight after the title when they have loaded, all on one line. */
export function WeekCard() {
  const router = useRouter();
  const { data: week } = useWeek();
  return (
    <Pressable testID="week-link" onPress={() => router.push(WEEK_ROUTE)} accessibilityRole="link" style={styles.card}>
      <View style={styles.text}>
        <Text style={styles.title}>{WEEK_TITLE}</Text>
        {week && <Text testID="week-card-metres" style={styles.metres}>{metresClimbedCopy(week.metresClimbed)}</Text>}
      </View>
      <Icon name="forward" size={CHEVRON_SIZE} color={colors.altitudeText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: spacing.sm3, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.altitudeSoft },
  text:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm3 },
  title:  { fontFamily: font.bold, fontSize: fontSize.base, color: colors.altitudeText },
  metres: { fontFamily: font.black, fontSize: fontSize.md, color: colors.altitudeDark },
});
