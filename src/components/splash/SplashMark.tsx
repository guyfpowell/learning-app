import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path, Polyline, Rect } from 'react-native-svg';
import { MARK_CHEVRONS, MARK_CHEVRON_STROKE, MARK_COLOUR, MARK_SQUARE, MARK_SQUARE_LENGTH, MARK_SQUARE_PATH, MARK_VIEW_BOX } from '@/assets/splashMark';
import { SPLASH_FAINT, SPLASH_MS, SPLASH_SIZE, chevronBandOf, type SplashVariant } from './splashSteps';

const SIZE = SPLASH_SIZE.mark;
const VIEW_BOX = `0 0 ${MARK_VIEW_BOX} ${MARK_VIEW_BOX}`;
const BAND = chevronBandOf(SIZE);
const EASE = Easing.bezier(0.2, 0.7, 0.2, 1);
const AnimatedPath = Animated.createAnimatedComponent(Path);

/** One layer of the mark, the whole mark's size, so layers stack exactly. */
function Layer({ children }: { children: React.ReactNode }) {
  return <Svg width={SIZE} height={SIZE} viewBox={VIEW_BOX} style={styles.layer}>{children}</Svg>;
}

function Chevron({ points, opacity = 1 }: { points: string; opacity?: number }) {
  return <Polyline points={points} fill="none" stroke={MARK_COLOUR} strokeOpacity={opacity} strokeWidth={MARK_CHEVRON_STROKE} strokeLinecap="round" strokeLinejoin="round" />;
}

function Square({ opacity = 1 }: { opacity?: number }) {
  const { x, y, width, height, rx, strokeWidth } = MARK_SQUARE;
  return <Rect x={x} y={y} width={width} height={height} rx={rx} fill="none" stroke={MARK_COLOUR} strokeOpacity={opacity} strokeWidth={strokeWidth} />;
}

/** The square solid; the chevrons faint, filling with colour from the bottom upwards. */
function LoadingChevrons() {
  const filled = useSharedValue(0);
  useEffect(() => {
    filled.value = withDelay(SPLASH_MS.fillAt, withTiming(1, { duration: SPLASH_MS.fillDone - SPLASH_MS.fillAt, easing: Easing.inOut(Easing.sin) }));
  }, [filled]);
  // The window slides up into place while its contents slide down by the same amount: the chevrons stay put and are uncovered from the bottom.
  const window = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - filled.value) * BAND.height }] }));
  const contents = useAnimatedStyle(() => ({ transform: [{ translateY: (filled.value - 1) * BAND.height }] }));
  return (
    <>
      <Layer>
        <Square />
        <Chevron points={MARK_CHEVRONS.lower} opacity={SPLASH_FAINT} />
        <Chevron points={MARK_CHEVRONS.upper} opacity={SPLASH_FAINT} />
      </Layer>
      <Animated.View testID="splash-chevron-fill" style={[styles.window, window]}>
        <Animated.View style={contents}>
          <View style={styles.inWindow}>
            <Layer>
              <Chevron points={MARK_CHEVRONS.lower} />
              <Chevron points={MARK_CHEVRONS.upper} />
            </Layer>
          </View>
        </Animated.View>
      </Animated.View>
    </>
  );
}

/** A chevron that rises into place `after` ms (the design's entrance). */
function RisingChevron({ points, after }: { points: string; after: number }) {
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = withDelay(after, withTiming(1, { duration: SPLASH_MS.chevronIn, easing: EASE }));
  }, [shown, after]);
  const style = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: (1 - shown.value) * SPLASH_SIZE.chevronRise }] }));
  return (
    <Animated.View style={[styles.layer, style]}>
      <Layer><Chevron points={points} /></Layer>
    </Animated.View>
  );
}

/** The square faint, filling clockwise from the top over the whole splash; the chevrons rise in as in the design. */
function LoadingSquare() {
  const filled = useSharedValue(0);
  useEffect(() => {
    filled.value = withTiming(1, { duration: SPLASH_MS.hold, easing: Easing.inOut(Easing.sin) });
  }, [filled]);
  const drawn = useAnimatedProps(() => ({ strokeDashoffset: (1 - filled.value) * MARK_SQUARE_LENGTH }));
  return (
    <>
      <Layer><Square opacity={SPLASH_FAINT} /></Layer>
      <Layer>
        <AnimatedPath
          animatedProps={drawn}
          d={MARK_SQUARE_PATH}
          fill="none"
          stroke={MARK_COLOUR}
          strokeWidth={MARK_SQUARE.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={[MARK_SQUARE_LENGTH, MARK_SQUARE_LENGTH]}
        />
      </Layer>
      <RisingChevron points={MARK_CHEVRONS.lower} after={SPLASH_MS.lowerChevronAt} />
      <RisingChevron points={MARK_CHEVRONS.upper} after={SPLASH_MS.upperChevronAt} />
    </>
  );
}

const LOADING: Record<SplashVariant, () => React.JSX.Element> = { chevrons: LoadingChevrons, square: LoadingSquare };

/** The splash's animated mark. */
export function SplashMark({ variant }: { variant: SplashVariant }) {
  const Loading = LOADING[variant];
  return (
    <View testID={`splash-mark-${variant}`} style={styles.mark}>
      <Loading />
    </View>
  );
}

const styles = StyleSheet.create({
  mark:     { width: SIZE, height: SIZE },
  layer:    { position: 'absolute', left: 0, top: 0 },
  window:   { position: 'absolute', left: 0, top: BAND.top, width: SIZE, height: BAND.height, overflow: 'hidden' },
  inWindow: { position: 'absolute', left: 0, top: -BAND.top, width: SIZE, height: SIZE },
});
