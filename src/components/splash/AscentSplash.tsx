import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Wordmark, wordmarkSize } from '@/components/ui/Wordmark';
import { wordmarkCobaltSvg } from '@/assets/logo';
import { colors } from '@/theme';
import { SplashMark } from './SplashMark';
import { SPLASH_MS, SPLASH_SIZE, type SplashVariant } from './splashSteps';

/** The height that makes the approved wordmark file the design's width. */
const WORD_HEIGHT = SPLASH_SIZE.wordWidth / wordmarkSize(1, wordmarkCobaltSvg).width;
/** The file has clear space above its letters (15 of its 70 units), which the gap under the mark already counts. */
const WORD_TOP_SPACE = (WORD_HEIGHT * 15) / 70;

const EASE = Easing.bezier(0.2, 0.7, 0.2, 1);

/**
 * The splash (design `24 Ascent Splash`, S.03 paper and cobalt): the mark settles in and loads, the wordmark follows,
 * and after `SPLASH_MS.hold` it fades gently to whatever is under it, then calls `onDone`. It covers the whole screen
 * and takes every touch while it shows.
 */
export function AscentSplash({ variant, onDone }: { variant: SplashVariant; onDone: () => void }) {
  const screen = useSharedValue(1);
  const mark = useSharedValue(0);
  const word = useSharedValue(0);
  // The caller's callback may change between renders; the timers read the latest.
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    mark.value = withTiming(1, { duration: SPLASH_MS.markIn, easing: EASE });
    word.value = withDelay(SPLASH_MS.wordAt, withTiming(1, { duration: SPLASH_MS.wordIn, easing: EASE }));
    screen.value = withDelay(SPLASH_MS.hold, withTiming(0, { duration: SPLASH_MS.fadeOut, easing: Easing.inOut(Easing.quad) }));
    const finished = setTimeout(() => done.current(), SPLASH_MS.hold + SPLASH_MS.fadeOut);
    return () => clearTimeout(finished);
  }, [screen, mark, word]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screen.value }));
  const markStyle = useAnimatedStyle(() => ({ opacity: mark.value, transform: [{ scale: SPLASH_SIZE.markFrom + (1 - SPLASH_SIZE.markFrom) * mark.value }] }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ translateY: (1 - word.value) * SPLASH_SIZE.wordRise }] }));

  return (
    <Animated.View testID="ascent-splash" style={[styles.screen, screenStyle]}>
      <Animated.View style={markStyle}>
        <SplashMark variant={variant} />
      </Animated.View>
      <Animated.View style={[styles.word, wordStyle]}>
        <Wordmark variant="cobalt" height={WORD_HEIGHT} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingBottom: SPLASH_SIZE.lift, backgroundColor: colors.paper },
  word:   { marginTop: SPLASH_SIZE.gap - WORD_TOP_SPACE },
});
