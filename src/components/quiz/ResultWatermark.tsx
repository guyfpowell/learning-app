import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ICON_PATHS } from '@/components/ui/Icon';
import { colors, results } from '@/theme';
import type { ResultTone } from '@/components/quiz/resultTone';

/** The design's 9c watermark: one huge outline glyph bleeding off the top right, drawn from the icon set's tick, retake and cross. */
const GLYPH_SIZE = 330;
const GLYPH_STROKE = 3.2;
const GLYPH_OFFSET = { right: -90, top: -10 } as const;
const WATERMARK_HEIGHT = 400;

const WATERMARKS = {
  correct:   { path: ICON_PATHS.check, color: colors.white, opacity: 0.13 },
  retry:     { path: ICON_PATHS.retake, color: results.retry.fg, opacity: 0.09 },
  incorrect: { path: ICON_PATHS.close, color: results.incorrect.accent, opacity: 0.3 },
} as const;

/** The glyph, colour and strength each verdict's background shows. */
export function watermarkOf(tone: ResultTone) {
  return WATERMARKS[tone];
}

/** The result screen's background mark. It sits behind the content and takes no touches. */
export function ResultWatermark({ tone }: { tone: ResultTone }) {
  const { path, color, opacity } = watermarkOf(tone);
  return (
    <View pointerEvents="none" style={styles.clip}>
      <Svg
        testID="quiz-frame-watermark"
        width={GLYPH_SIZE}
        height={GLYPH_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        style={styles.glyph}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Path d={path} stroke={color} strokeOpacity={opacity} strokeWidth={GLYPH_STROKE} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  clip:  { position: 'absolute', left: 0, right: 0, top: 0, height: WATERMARK_HEIGHT, overflow: 'hidden' },
  glyph: { position: 'absolute', ...GLYPH_OFFSET },
});
