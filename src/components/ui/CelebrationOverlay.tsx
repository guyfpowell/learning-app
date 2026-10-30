import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { colors, font, fontSize, radius, shadow, spacing, tracking } from '@/theme';
import { Button } from '@/components/ui/Button';

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
        <Text testID="celebration-title" style={styles.title}>{title}</Text>
        <Text testID="celebration-name" style={styles.name}>{name}</Text>
        <Text testID="celebration-description" style={styles.description}>{description}</Text>
        <Button testID="celebration-dismiss" label="Tap to dismiss" variant="coral" onPress={dismiss} style={styles.dismissBtn} />
      </Animated.View>
    </Pressable>
  );
}

/** Animated chip for ordinary XP awards — lighter than the full overlay. */
interface XpChipOverlayProps {
  xp: number;
  visible: boolean;
  onDismiss: () => void;
  autoDismissMs?: number;
  /** A box (top and height) to centre the chip in, instead of the default spot. */
  anchor?: { top: number; height: number };
}

export function XpChipOverlay({ xp, visible, onDismiss, autoDismissMs = 2000, anchor }: XpChipOverlayProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      testID="xp-chip-overlay"
      style={[styles.xpChipContainer, anchor && { ...anchor, justifyContent: 'center' }]}
      onPress={dismiss}
      accessibilityLabel="Dismiss XP award"
    >
      <Animated.View
        testID="xp-chip-animated"
        style={[
          styles.xpChip,
          {
            opacity: anim,
            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          },
        ]}
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  card: {
    backgroundColor: colors.brand,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: 360,
    width: '100%',
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
