import { Fragment, type ReactNode } from 'react';
import { View } from 'react-native';
import { levelTicks } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { railStylesOf, tickStyleOf } from './chartStyles';

/** The rail (white, with ink over the light bands), whatever marks the levels on its left (`children`), and the gold rail and dot from the learner's height (`markerY`, down the canvas) to sea level. */
export function ChartRail({ markerY, children }: { markerY: number; children: ReactNode }) {
  const rail = railStylesOf(markerY);
  return (
    <>
      <View testID="altitude-rail" pointerEvents="none" style={rail.base} />
      <View pointerEvents="none" style={rail.lightBands} />
      {children}
      <View testID="altitude-rail-gold" pointerEvents="none" style={rail.gold} />
      <View testID="altitude-rail-dot" pointerEvents="none" style={rail.dot} />
    </>
  );
}

/** The Altitude view's level ticks, every fifth longer and labelled "L5" … "L30". */
export function LevelLabelTicks() {
  return (
    <>
      {levelTicks().map((tick) => {
        const { line, label } = tickStyleOf(tick);
        return (
          <Fragment key={tick.level}>
            <View testID={`altitude-tick-${tick.level}`} pointerEvents="none" style={line} />
            {label !== null && <Text testID={`altitude-tick-label-${tick.level}`} pointerEvents="none" style={label}>{tick.label}</Text>}
          </Fragment>
        );
      })}
    </>
  );
}
