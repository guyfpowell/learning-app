import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Animated, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALTITUDE_VIEW_TITLE, heightChartPosition, levelOf } from '@learning/shared';
import { LandmarkUnlock } from '@/components/celebrations/LandmarkUnlock';
import { AltitudeChart } from './AltitudeChart';
import { AltitudeHeader } from './AltitudeHeader';
import { NEXT_CARD_LEFT, NEXT_CARD_RIGHT } from './NextLandmarkCard';
import { PILL_SLOT, YouPill } from './YouMarker';
import { altitudeLayoutOf, canvasYOf, openingOffsetOf } from './chartLayout';
import { headerLookOf, headerSampleYOf, slotStyleOf } from './chartStyles';
import { ARRIVAL_BURST, ARRIVAL_SCALE, coverOfNextCard, type ArrivalPlan } from './arrivalSteps';
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
  // Two circles grow out of the hole. A white one is the explosion. The card is revealed by a second, later one: it scales up and its contents scale back down by the same amount, so the card stays full size and is only uncovered, and it fades in as it goes.
  const revealSize = 2 * Math.hypot(windowWidth, viewportHeight);
  const burstOf = (from: number, to: number, outputRange: [number, number]) => run.burst.interpolate({ inputRange: [from, to], outputRange, extrapolate: 'clamp' });
  const circleStyle = (scale: Animated.AnimatedInterpolation<number>, opacity: Animated.AnimatedInterpolation<number>) => ({
    position: 'absolute' as const,
    left: holeX - revealSize / 2,
    top: holeY - revealSize / 2,
    width: revealSize,
    height: revealSize,
    borderRadius: revealSize / 2,
    overflow: 'hidden' as const,
    opacity,
    transform: [{ scale }],
  });
  const appears = run.sink.interpolate({ inputRange: [0, 0.9, 1], outputRange: [0, 0, 1] });
  const explosionStyle = [circleStyle(burstOf(0, ARRIVAL_BURST.exploded, [ARRIVAL_SCALE.hole, 1]), appears), styles.flash];
  const reveal = burstOf(ARRIVAL_BURST.cardFrom, 1, [ARRIVAL_SCALE.hole, 1]);
  const revealStyle = circleStyle(reveal, burstOf(ARRIVAL_BURST.cardFrom, ARRIVAL_BURST.cardFrom + ARRIVAL_BURST.cardFadeLength, [0, 1]));
  const revealContentStyle = { ...StyleSheet.absoluteFill, transform: [{ scale: Animated.divide(1, reveal) }] };

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
      <Animated.View testID="arrival-flash" pointerEvents="none" style={explosionStyle} />
      {run.reached && (
        <Animated.View pointerEvents={run.cardShown ? 'auto' : 'none'} style={revealStyle}>
          <Animated.View style={revealContentStyle}>
            <View style={{ position: 'absolute', left: revealSize / 2 - holeX, top: revealSize / 2 - holeY, width: windowWidth, height: viewportHeight }}>
              <LandmarkUnlock unlock={plan.unlock} onContinue={onContinue} />
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  flash:  { backgroundColor: '#FFFFFF' },
});
