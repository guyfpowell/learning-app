import { View } from 'react-native';
import type { HeightBand } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { BAND_LOOK } from './chartLayout';
import { bandBoundaryStyleOf, bandNameSlotOf, bandNameStyleOf } from './chartStyles';

/** One band of the chart: its name rotated 90 degrees at the right edge, centred on the band, and, under every band but the lowest, the line on its lower boundary. `index` counts from the top band. */
export function AltitudeBand({ band, index, hasBoundary }: { band: HeightBand; index: number; hasBoundary: boolean }) {
  return (
    <>
      <View pointerEvents="none" style={bandNameSlotOf(index)}>
        <Text testID={`altitude-band-${band.key}`} style={bandNameStyleOf(BAND_LOOK[band.key])} numberOfLines={1}>{band.name.toUpperCase()}</Text>
      </View>
      {hasBoundary && <View testID={`altitude-band-boundary-${band.key}`} pointerEvents="none" style={bandBoundaryStyleOf(index)} />}
    </>
  );
}
