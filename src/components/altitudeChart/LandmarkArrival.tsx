import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Animated, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALTITUDE_VIEW_TITLE, heightChartPosition, levelOf } from '@learning/shared';
import { LandmarkUnlock, type LandmarkEntrance } from '@/components/celebrations/LandmarkUnlock';
import { AltitudeChart } from './AltitudeChart';
import { AltitudeHeader } from './AltitudeHeader';
import { NEXT_CARD_LEFT, NEXT_CARD_RIGHT } from './NextLandmarkCard';
import { PILL_SLOT, YouPill } from './YouMarker';
import { altitudeLayoutOf, canvasYOf, openingOffsetOf } from './chartLayout';
import { headerLookOf, headerSampleYOf, slotStyleOf } from './chartStyles';
import { ARRIVAL_SCALE, badgeFullScale, coverOfNextCard, type ArrivalPlan } from './arrivalSteps';
import { useLandmarkArrival } from './useLandmarkArrival';

const noop = () => { /* a tap on the chart during the arrival does nothing */ };

/** Where the bubble rests on the previous landmark, down the canvas. */
function markerYOf({ before }: ArrivalPlan, now: Date): number {
  return canvasYOf(altitudeLayoutOf(before.altitude, before.achievements, now, undefined).marker.shownOffset);
}

/** Where the earned landmark's Next card is, down the canvas, before it is reached. A landmark the chart does not list (it should always list it) leaves the bubble where it is, rather than breaking the celebration. */
function nextCardYOf({ before, unlock }: ArrivalPlan, now: Date): number {
  const { rows, marker } = altitudeLayoutOf(before.altitude, before.achievements, now, undefined);
  return canvasYOf(rows.find((r) => r.key === unlock.key)?.shownOffset ?? marker.shownOffset);
}

/**
 * The landmark arrival (ticket 114): the Altitude screen at the previous landmark, the learner's bubble falling into
 * it from above, floating up to the landmark just earned (its Next card), sinking into a hole, then the landmark's
 * full screen card exploding out. It draws what `plan` says; back skips it (`onBack`), the card's Continue ends it.
 */
export function LandmarkArrival({ plan, name, onBack, onContinue }: { plan: ArrivalPlan; name: string; onBack: () => void; onContinue: () => void }) {
  const { height: viewportHeight, width: windowWidth } = useWindowDimensions();
  const { top: topInset } = useSafeAreaInsets();
  const [now] = useState(() => new Date());
  const [pillWidth, setPillWidth] = useState(0);
  const [medalCentre, setMedalCentre] = useState<{ x: number; y: number } | null>(null);
  const run = useLandmarkArrival(plan);
  const fromY = markerYOf(plan, now);
  const toY = nextCardYOf(plan, now);
  const middle = heightChartPosition((plan.fromMetres + plan.toMetres) / 2);
  const offset = openingOffsetOf(middle, viewportHeight);
  const headerLook = headerLookOf(headerSampleYOf(offset, topInset));
  const cover = coverOfNextCard(pillWidth, windowWidth);
  const holeX = NEXT_CARD_LEFT + (windowWidth - NEXT_CARD_LEFT - NEXT_CARD_RIGHT) / 2;
  const holeY = toY - offset;

  const bubbleStyle = {
    opacity: Animated.multiply(
      run.fall.interpolate({ inputRange: [0, 0.6], outputRange: [0, 1], extrapolate: 'clamp' }),
      run.sink.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
    ),
    transform: [
      { translateX: run.float.interpolate({ inputRange: [0, 1], outputRange: [0, cover.shiftX] }) },
      { translateY: run.float.interpolate({ inputRange: [0, 1], outputRange: [0, toY - fromY] }) },
      {
        scale: Animated.multiply(
          Animated.multiply(
            run.fall.interpolate({ inputRange: [0, 1], outputRange: [ARRIVAL_SCALE.start, 1] }),
            run.float.interpolate({ inputRange: [0, 1], outputRange: [1, cover.scale] }),
          ),
          Animated.multiply(
            run.pulse.interpolate({ inputRange: [0, 1], outputRange: [1, ARRIVAL_SCALE.pulse] }),
            run.sink.interpolate({ inputRange: [0, 1], outputRange: [1, ARRIVAL_SCALE.hole] }),
          ),
        ),
      },
    ],
  };
  // The landmark's badge grows out of the hole over the chart until it covers the screen; the card then shows behind it and the badge falls back onto its place on the card, pressing down and springing back as it lands.
  const full = badgeFullScale(windowWidth, viewportHeight);
  const growScale = run.grow.interpolate({ inputRange: [0, 1], outputRange: [ARRIVAL_SCALE.hole, full] });
  const landDelta = run.land.interpolate({ inputRange: [0, 1], outputRange: [0, ARRIVAL_SCALE.landing - full] });
  const riseDelta = run.rise.interpolate({ inputRange: [0, 1], outputRange: [0, 1 - ARRIVAL_SCALE.landing] });
  const spot = medalCentre ?? { x: holeX, y: holeY };
  const entrance: LandmarkEntrance = {
    onMedalCentre: setMedalCentre,
    chromeOpacity: run.grow.interpolate({ inputRange: [0.98, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
    medalStyle: {
      opacity: run.sink.interpolate({ inputRange: [0, 0.9, 1], outputRange: [0, 0, 1] }),
      transform: [
        { translateX: run.land.interpolate({ inputRange: [0, 1], outputRange: [holeX - spot.x, 0] }) },
        { translateY: run.land.interpolate({ inputRange: [0, 1], outputRange: [holeY - spot.y, 0] }) },
        { scale: Animated.add(Animated.add(growScale, landDelta), riseDelta) },
      ],
    },
  };

  return (
    <View testID="landmark-arrival" style={styles.screen}>
      <ScrollView scrollEnabled={false} contentOffset={{ x: 0, y: offset }}>
        <View>
          <AltitudeChart altitude={plan.before.altitude} achievements={plan.before.achievements} name={name} timezone={undefined} now={now} showMarker={false} onPress={noop} />
          <View testID="arrival-pill" pointerEvents="none" style={slotStyleOf(fromY)}>
            <Animated.View style={[PILL_SLOT, bubbleStyle]} onLayout={({ nativeEvent }: LayoutChangeEvent) => setPillWidth(nativeEvent.layout.width)}>
              <YouPill name={name} metres={run.metres} level={levelOf(plan.fromMetres)} showLevel={false} />
            </Animated.View>
          </View>
        </View>
      </ScrollView>
      <AltitudeHeader title={ALTITUDE_VIEW_TITLE.altitude} look={headerLook} topInset={topInset} onBack={onBack} />
      {run.reached && (
        <View pointerEvents={run.cardShown ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
          <LandmarkUnlock unlock={plan.unlock} onContinue={onContinue} entrance={entrance} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
});
