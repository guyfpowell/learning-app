import { useEffect, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import * as Sentry from '@sentry/react-native';

/** How long a block takes to appear, and how far below its place it starts. */
const REVEAL_MS = 320;
const REVEAL_RISE = 14;

/** The first block waits this long, so a heading's own entrance finishes first; each next block waits one step more. */
const REVEAL_START_MS = 280;
const REVEAL_STEP_MS = 130;

/** The delay of the nth block (0 is the first) in a staged reveal. */
export function revealDelay(step: number): number {
  return REVEAL_START_MS + step * REVEAL_STEP_MS;
}

/**
 * Fades a block in and lifts it into place after `delay`, so a screen's parts arrive in order. It
 * shows at once for someone who has asked their phone to reduce motion.
 */
export function Reveal({ delay, children }: { delay: number; children: ReactNode }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled()
      .catch((err) => {
        Sentry.addBreadcrumb({ category: 'ui', message: 'Reduce-motion check failed', level: 'warning', data: { err: String(err) } });
        return false;
      })
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          progress.setValue(1);
          return;
        }
        Animated.timing(progress, { toValue: 1, duration: REVEAL_MS, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      });
    return () => { cancelled = true; };
  }, [delay, progress]);

  return (
    <Animated.View
      testID="reveal"
      style={{
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [REVEAL_RISE, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}
