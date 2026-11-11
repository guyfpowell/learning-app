import React, { useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Contours } from '@/components/ui/Contours';
import { colors, gradients, radius, shadow, spacing } from '@/theme';

/** How many contour rings the card draws. */
const CONTOUR_RINGS = 12;

/** The one cobalt card of a screen: a radial gradient from the top right, with contour lines. */
export function CobaltHero({ children, testID }: { children: ReactNode; testID?: string }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => setSize(e.nativeEvent.layout);
  const { at, stops } = gradients.cobaltHero;
  return (
    // The shadow sits on the outer view: a view that clips its children would clip it too.
    <View testID={testID} style={styles.shadow}>
      <View style={styles.clip} onLayout={onLayout}>
        {size.width > 0 && (
          <>
            <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill}>
              <Defs>
                <RadialGradient id="cobaltHero" cx={`${at.x * 100}%`} cy={`${at.y * 100}%`} r="140%">
                  {stops.map(stop => <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />)}
                </RadialGradient>
              </Defs>
              <Rect width={size.width} height={size.height} fill="url(#cobaltHero)" />
            </Svg>
            <Contours
              color={colors.white}
              opacity={gradients.contourOpacity}
              width={size.width}
              height={size.height}
              cx={size.width * 0.9}
              cy={0}
              rings={CONTOUR_RINGS}
              innerRadius={size.width * 0.14}
              ringGap={size.width * 0.075}
            />
          </>
        )}
        <View style={styles.body}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { borderRadius: radius.xl, backgroundColor: colors.brand, ...shadow.brand },
  clip:   { borderRadius: radius.xl, overflow: 'hidden' },
  body:   { padding: spacing.lg, gap: spacing.sm3 },
});
