import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { LayoutChangeEvent, TextLayoutEvent } from 'react-native';
import { colors } from '@/theme';
import {
  nextTakeawayFit,
  TAKEAWAY_LINE_HEIGHT,
  TAKEAWAY_MAX_PAGE_SHARE,
  TAKEAWAY_RANGE,
} from '@/lib/fitTakeaway';
import type { SizeRange, TakeawayFit } from '@/lib/fitTakeaway';

interface FittedTextProps {
  text: string;
  /** The wrapper's id; the text itself is `${testID}-text`. */
  testID: string;
  fontFamily: string;
  lineHeight?: number;
  /** The sizes it may move within; the takeaway's by default. */
  range?: SizeRange;
}

/**
 * Large lead text whose size is fitted so the last line runs nearly to the right edge, within half
 * the window's height (`fitTakeaway.ts`, 096). Used by the key takeaway and the quiz question.
 * It is hidden until the size settles.
 */
export function FittedText({ text, testID, fontFamily, lineHeight = TAKEAWAY_LINE_HEIGHT, range = TAKEAWAY_RANGE }: FittedTextProps) {
  const startFit: TakeawayFit = { size: range.max, settled: false };
  const { height: windowHeight } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const [fit, setFit] = useState<TakeawayFit>(startFit);

  function handleLayout(e: LayoutChangeEvent) {
    const next = e.nativeEvent.layout.width;
    if (next === width) return;
    setWidth(next);
    setFit(startFit);
  }

  function handleTextLayout(e: TextLayoutEvent) {
    // Wait for the width: the Text remounts when it arrives (see `key`), which measures it again.
    if (fit.settled || width <= 0) return;
    setFit(nextTakeawayFit(e.nativeEvent.lines, fit.size, width, windowHeight * TAKEAWAY_MAX_PAGE_SHARE, fit.best, range));
  }

  return (
    <View testID={testID} onLayout={handleLayout}>
      <Text
        key={width}
        testID={`${testID}-text`}
        onTextLayout={handleTextLayout}
        style={[styles.text, { fontFamily, fontSize: fit.size, lineHeight: fit.size * lineHeight }, !fit.settled && styles.measuring]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  text:      { color: colors.textStrong },
  measuring: { opacity: 0 },
});
