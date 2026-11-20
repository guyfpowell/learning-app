import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { ALTITUDE_LOAD_ERROR } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { AltitudeBlock } from '@/components/altitude/AltitudeBlock';
import { useAltitude } from '@/hooks/useAltitude';
import { colors, font, fontSize } from '@/theme';

/** The altitude block where Home and the Progress tab show it: the block, or the load error; nothing while it loads. `onPress` makes the block one button (Home opens the Altitude chart); the Progress tab passes null. */
export function AltitudeSection({ trailing, onPress }: { trailing: ReactNode; onPress: (() => void) | null }) {
  const { data, isError } = useAltitude();
  if (isError) return <Text testID="altitude-load-error" style={styles.error}>{ALTITUDE_LOAD_ERROR}</Text>;
  return data ? <AltitudeBlock altitude={data} trailing={trailing} onPress={onPress} /> : null;
}

const styles = StyleSheet.create({
  error: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.error },
});
