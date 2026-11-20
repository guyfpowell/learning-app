import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ACHIEVEMENTS_BY_KEY,
  SMALL_MESSAGE_MS,
  STEP_GLYPH,
  hasMedalArt,
  smallMessageOf,
  trailheadStepArtOf,
  type RewardUnlock,
} from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { Medal } from '@/components/ui/Medal';
import { useAutoDismiss } from '@/hooks/useAutoDismiss';
import { colors, font, shadow } from '@/theme';

/** How far up a finger must travel to swipe the message away, in points. */
export const SWIPE_UP_DISTANCE = 24;
const SLIDE_FROM = -140;
const SLIDE_MS = 220;
const ICON_SIZE = 40;
const STEP_ICON_SIZE = 22;
const OFF_WHITE = '#FBFAF7';
const PEEK_COLOR = '#ECE8E0';

interface SmallMessageProps {
  unlock: RewardUnlock;
  /** "1 of 2" while others wait behind this one (`smallMessageCountOf`); null when it is the only one. */
  count: string | null;
  /** The time ran out, or it was swiped away. */
  onDone: () => void;
  /** It was tapped: open the medal's sheet. */
  onOpen: () => void;
}

/** A step's icon in a cobalt-soft circle (design T2); a medal's own art at about 40px (design T1). */
function Lead({ unlock }: { unlock: RewardUnlock }) {
  const stepArt = trailheadStepArtOf(unlock.key);
  if (stepArt) {
    return (
      <View testID="small-message-step-icon" style={styles.stepCircle}>
        <Svg width={STEP_ICON_SIZE} height={STEP_ICON_SIZE} viewBox={STEP_GLYPH.viewBox} fill="none" stroke={colors.brand} strokeWidth={STEP_GLYPH.strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <Path d={stepArt.glyph} />
        </Svg>
      </View>
    );
  }
  const definition = ACHIEVEMENTS_BY_KEY[unlock.key];
  return <View style={styles.medal}>{hasMedalArt(definition) && <Medal definition={definition} size={ICON_SIZE} />}</View>;
}

/** The timer line along the bottom edge: it grows across as the message's time runs out. */
function TimerLine({ step }: { step: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: SMALL_MESSAGE_MS, easing: Easing.linear, useNativeDriver: false }).start();
    return () => progress.stopAnimation();
  }, [progress]);
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return <Animated.View testID="small-message-timer" style={[styles.timer, step && styles.timerStep, { width }]} />;
}

/**
 * The small celebration message (ADR-022, brief item 6, design T1 to T3): slides in from the top under the
 * status bar over any screen, stays `SMALL_MESSAGE_MS` with a hairline that runs as the timer, swipes up to
 * go, and opens the medal's sheet when tapped. The server chose this size; nothing here works it out.
 */
export function SmallMessage({ unlock, count, onDone, onOpen }: SmallMessageProps) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(SLIDE_FROM)).current;
  const swipeStart = useRef(0);
  const isStep = unlock.kind === 'trailhead-step';

  useEffect(() => {
    Animated.timing(slide, { toValue: 0, duration: SLIDE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [slide]);
  useAutoDismiss(true, onDone, SMALL_MESSAGE_MS);

  return (
    <Animated.View
      testID="small-message-swipe"
      style={[styles.wrap, { top: insets.top + 4, transform: [{ translateY: slide }] }]}
      onTouchStart={(e) => { swipeStart.current = e.nativeEvent.pageY; }}
      onTouchEnd={(e) => { if (swipeStart.current - e.nativeEvent.pageY >= SWIPE_UP_DISTANCE) onDone(); }}
    >
      {count !== null && <View testID="small-message-peek" style={styles.peek} />}
      <Pressable testID="small-message" accessibilityRole="button" onPress={onOpen} style={[styles.card, shadow.md]}>
        <Lead unlock={unlock} />
        <Text testID="small-message-line" numberOfLines={2} style={styles.line}>{smallMessageOf(unlock)}</Text>
        {count !== null && <Text testID="small-message-count" style={styles.count}>{count}</Text>}
        <Icon name="forward" size={18} color={colors.textMuted} strokeWidth={2.4} />
        <TimerLine step={isStep} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 1000 },
  peek: { position: 'absolute', left: 12, right: 12, bottom: -8, height: 30, borderRadius: 20, backgroundColor: PEEK_COLOR, transform: [{ scale: 0.94 }] },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14, borderRadius: 20, backgroundColor: OFF_WHITE, overflow: 'hidden' },
  medal: { width: ICON_SIZE, alignItems: 'center' },
  stepCircle: { width: ICON_SIZE, height: ICON_SIZE, borderRadius: ICON_SIZE / 2, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, fontFamily: font.bold, fontSize: 15, color: colors.textStrong },
  count: { fontFamily: font.bold, fontSize: 12, color: colors.textMuted },
  timer: { position: 'absolute', left: 0, bottom: 0, height: 3, backgroundColor: colors.borderStrong },
  timerStep: { backgroundColor: colors.brand },
});
