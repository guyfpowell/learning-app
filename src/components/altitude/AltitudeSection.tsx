import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ALTITUDE_LOAD_ERROR, type AltitudeScreen, type AltitudeView } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { AltitudeBlock } from '@/components/altitude/AltitudeBlock';
import { useAltitude } from '@/hooks/useAltitude';
import { altitudeRoute } from '@/lib/routes';
import { colors, font, fontSize } from '@/theme';

/** The altitude block where Home and the Progress tab show it: the block, which opens the Height Chart on the `opens` view (Home: Altitude; the Progress tab: Level), or the load error; nothing while it loads. */
export function AltitudeSection({ screen, opens, trailing }: { screen: AltitudeScreen; opens: AltitudeView; trailing: ReactNode }) {
  const router = useRouter();
  const { data, isError } = useAltitude();
  if (isError) return <Text testID="altitude-load-error" style={styles.error}>{ALTITUDE_LOAD_ERROR}</Text>;
  return data ? <AltitudeBlock screen={screen} altitude={data} trailing={trailing} onPress={() => router.push(altitudeRoute(opens))} /> : null;
}

const styles = StyleSheet.create({
  error: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.error },
});
