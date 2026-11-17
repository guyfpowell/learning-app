import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { fontSize, font, lineHeight, results, spacing, trackingEm } from '@/theme';
import { VerdictMark } from '@/components/quiz/ResultSections';
import type { ResultTone } from '@/components/quiz/resultTone';
import { nextFeedbackPhrase } from '@/lib/quizFeedbackPhrase';

// A correct heading bursts in from far behind the screen, overshoots, then a springy pull settles it.
// It is left-aligned at rest: it expands from the left into the centre of the screen, then back to the left.
const HEADING_START_SCALE = 0.05;
const HEADING_BURST_SCALE = 1.7;
const HEADING_BURST_MS = 260;
const HEADING_FADE_MS = 120;
const HEADING_SETTLE_MS = 400;

/** How far right of the left edge a heading of `textWidth`, scaled from its left edge, sits centred in `boxWidth`. */
export function burstShift(boxWidth: number, textWidth: number, scale: number): number {
  return (boxWidth - scale * textWidth) / 2;
}

function useHeadingBurst(enabled: boolean, boxWidth: number, textWidth: number) {
  const scale = useRef(new Animated.Value(enabled ? HEADING_START_SCALE : 1)).current;
  const settle = useRef(new Animated.Value(enabled ? 0 : 1)).current;
  const opacity = useRef(new Animated.Value(enabled ? 0 : 1)).current;
  const started = useRef(false);
  const measured = boxWidth > 0 && textWidth > 0;
  useEffect(() => {
    if (!enabled || !measured || started.current) return;
    started.current = true;
    const burst = Animated.sequence([
      Animated.timing(scale, {
        toValue: HEADING_BURST_SCALE,
        duration: HEADING_BURST_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
        Animated.timing(settle, { toValue: 1, duration: HEADING_SETTLE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]);
    const fade = Animated.timing(opacity, { toValue: 1, duration: HEADING_FADE_MS, useNativeDriver: true });
    Animated.parallel([burst, fade]).start();
  }, [enabled, measured, scale, settle, opacity]);
  if (!enabled) return undefined;
  // While bursting the text is centred; `settle` carries it back to the left edge as the scale returns to 1.
  const centred = scale.interpolate({
    inputRange: [0, 2],
    outputRange: [burstShift(boxWidth, textWidth, 0), burstShift(boxWidth, textWidth, 2)],
  });
  const left = settle.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  return { opacity, transformOrigin: 'left center', transform: [{ translateX: Animated.multiply(left, centred) }, { scale }] };
}

/** A result screen's headline: its tone, its words and whether it bursts in. */
export interface ResultHeadline {
  tone: ResultTone;
  phrase: string;
  burst: boolean;
}

/**
 * The headline, picked once when a result screen appears, so a re-render never changes the word.
 * A screen whose heading is drawn again (the finished view when the reply lands) holds it and
 * passes it down, so the words stay and the burst doesn't play twice.
 */
export function useResultHeadline(tone: ResultTone): ResultHeadline {
  const [headline] = useState(() => {
    const correct = tone === 'correct';
    return { tone, phrase: nextFeedbackPhrase(correct), burst: correct };
  });
  return headline;
}

/** The verdict screen's top: the verdict mark, the headline, then whatever sits under it (XP, average, a nudge). */
export function ResultHeading({ headline, children }: { headline: ResultHeadline; children?: React.ReactNode }) {
  const { tone, phrase } = headline;
  const [boxWidth, setBoxWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const burst = useHeadingBurst(headline.burst, boxWidth, textWidth);
  return (
    <View testID="result-headline" style={styles.verdictTop} onLayout={e => setBoxWidth(e.nativeEvent.layout.width)}>
      <VerdictMark tone={tone} />
      <Animated.Text
        testID="result-heading"
        style={[styles.verdictHeading, { color: results[tone].fg }, burst]}
        numberOfLines={1}
        adjustsFontSizeToFit
        onLayout={e => setTextWidth(prev => prev || e.nativeEvent.layout.width)}
      >
        {phrase}
      </Animated.Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  verdictTop:     { gap: spacing.sm3, marginTop: spacing.lg, marginBottom: spacing.md },
  verdictHeading: {
    alignSelf:     'flex-start',
    maxWidth:      '100%',
    fontFamily:    font.display,
    fontSize:      fontSize.hero,
    lineHeight:    fontSize.hero * lineHeight.tight,
    letterSpacing: trackingEm.display * fontSize.hero,
  },
});
