import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { BlurView } from 'expo-blur';
import { colors, font, fontSize, radius, shadow, spacing, tracking } from '@/theme';
import { Button } from '@/components/ui/Button';

/** Blur strength and cobalt tint of the achievement card's glass (096). */
const CARD_BLUR = 40;
const CARD_WASH_OPACITY = 0.6;

interface CelebrationOverlayProps {
  visible: boolean;
  title: string;
  name: string;
  description: string;
  onDismiss: () => void;
  /** Auto-dismiss delay in ms (default 6000) */
  autoDismissMs?: number;
}

export function CelebrationOverlay({
  visible,
  title,
  name,
  description,
  onDismiss,
  autoDismissMs = 6000,
}: CelebrationOverlayProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;

    Animated.spring(anim, {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();

    timerRef.current = setTimeout(() => {
      dismiss();
    }, autoDismissMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  function dismiss() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.timing(anim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      anim.setValue(0);
      onDismiss();
    });
  }

  if (!visible) return null;

  return (
    <Pressable
      testID="celebration-backdrop"
      style={styles.backdrop}
      onPress={dismiss}
      accessibilityLabel="Dismiss celebration"
    >
      <Animated.View
        testID="celebration-card"
        style={[
          styles.card,
          shadow.brand as object,
          {
            opacity: anim,
            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
          },
        ]}
      >
        <BlurView testID="celebration-blur" intensity={CARD_BLUR} tint="dark" style={StyleSheet.absoluteFill} />
        <View testID="celebration-wash" style={styles.wash} pointerEvents="none" />
        <Text testID="celebration-title" style={styles.title}>{title}</Text>
        <Text testID="celebration-name" style={styles.name}>{name}</Text>
        <Text testID="celebration-description" style={styles.description}>{description}</Text>
        <Button testID="celebration-dismiss" label="Tap to dismiss" variant="coral" onPress={dismiss} style={styles.dismissBtn} />
      </Animated.View>
    </Pressable>
  );
}

/** A box on the screen, in window coordinates. */
export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** How long the chip takes to fly back to the score it came from. */
const COLLAPSE_MS = 480;
/** The chip never shrinks below this share of its size on the way back, so it does not vanish before it lands. */
const MIN_RETURN_SCALE = 0.3;

/** How far, and how small, the chip goes to land on the score: the centre of the chip to the centre of the score. */
export function xpFlight(opts: {
  anchor: { top: number; height: number };
  returnTo: ScreenRect;
  chipWidth: number;
  windowWidth: number;
}): { dx: number; dy: number; endScale: number } {
  const { anchor, returnTo, chipWidth, windowWidth } = opts;
  return {
    dx: returnTo.x + returnTo.width / 2 - windowWidth / 2,
    dy: returnTo.y + returnTo.height / 2 - (anchor.top + anchor.height / 2),
    endScale: Math.max(MIN_RETURN_SCALE, returnTo.width / chipWidth),
  };
}

/** Animated chip for ordinary XP awards: lighter than the full overlay. */
interface XpChipOverlayProps {
  xp: number;
  visible: boolean;
  onDismiss: () => void;
  autoDismissMs?: number;
  /** A box (top and height) to centre the chip in, instead of the default spot. */
  anchor?: { top: number; height: number };
  /** Where the XP score sits on the screen: the chip collapses back onto it as it goes. Without it, the chip fades. */
  returnTo?: ScreenRect | null;
}

export function XpChipOverlay({ xp, visible, onDismiss, autoDismissMs = 2000, anchor, returnTo }: XpChipOverlayProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const collapse = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [chipWidth, setChipWidth] = useState<number | null>(null);

  const flight = anchor && returnTo && chipWidth
    ? xpFlight({ anchor, returnTo, chipWidth, windowWidth: Dimensions.get('window').width })
    : null;
  // The auto-dismiss timer is set once, on the first render, before the chip or the score has been measured.
  // It reads the flight from here, so it sees the latest one when it fires.
  const flightRef = useRef(flight);
  flightRef.current = flight;

  useEffect(() => {
    if (!visible) return;

    Animated.spring(anim, {
      toValue: 1,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();

    timerRef.current = setTimeout(() => {
      dismiss();
    }, autoDismissMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  function dismiss() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Back onto the score when we know where it is; otherwise fade where it stands.
    const leave = flightRef.current
      ? Animated.timing(collapse, { toValue: 1, duration: COLLAPSE_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })
      : Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true });
    leave.start(() => {
      anim.setValue(0);
      collapse.setValue(0);
      onDismiss();
    });
  }

  if (!visible) return null;

  const popScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const style = flight
    ? {
        // Fully visible until the last fifth of the flight, then gone as it lands.
        opacity: Animated.multiply(anim, collapse.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] })),
        transform: [
          { translateX: collapse.interpolate({ inputRange: [0, 1], outputRange: [0, flight.dx] }) },
          { translateY: collapse.interpolate({ inputRange: [0, 1], outputRange: [0, flight.dy] }) },
          { scale: Animated.multiply(popScale, collapse.interpolate({ inputRange: [0, 1], outputRange: [1, flight.endScale] })) },
        ],
      }
    : { opacity: anim, transform: [{ scale: popScale }] };

  return (
    <Pressable
      testID="xp-chip-overlay"
      style={[styles.xpChipContainer, anchor && { ...anchor, justifyContent: 'center' }]}
      onPress={dismiss}
      accessibilityLabel="Dismiss XP award"
    >
      <Animated.View
        testID="xp-chip-animated"
        onLayout={(e: LayoutChangeEvent) => setChipWidth(e.nativeEvent.layout.width)}
        style={[styles.xpChip, style]}
      >
        <Text testID="xp-chip-text" style={styles.xpChipText}>+{xp} XP</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  card: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.brandSoft,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: 360,
    width: '100%',
  },
  wash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.brand,
    opacity: CARD_WASH_OPACITY,
  },
  title: {
    fontFamily: font.semibold,
    fontSize: fontSize.sm,
    color: colors.brandSoft,
    textTransform: 'uppercase',
    letterSpacing: tracking.caps,
    marginBottom: spacing.xs,
  },
  name: {
    fontFamily: font.bold,
    fontSize: fontSize.xl,
    color: colors.onBrand,
    textAlign: 'center',
  },
  description: {
    fontFamily: font.regular,
    fontSize: fontSize.md,
    color: colors.brandSoft,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  dismissBtn: {
    marginTop: spacing.md,
  },
  xpChipContainer: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  xpChip: {
    backgroundColor: '#FEF3C7',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  xpChipText: {
    fontFamily: font.semibold,
    fontSize: fontSize.lg,
    color: '#B45309',
  },
});
