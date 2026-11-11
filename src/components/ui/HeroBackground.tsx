import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Contours } from '@/components/ui/Contours';
import type { SkillLevel } from '@learning/shared';
import { colors, gradients, levelCard } from '@/theme';

/** How many contour rings it draws. */
const CONTOUR_RINGS = 12;

/**
 * A level's colour washed over whatever it sits in: a radial gradient from the top right, with
 * contour lines. It fills its parent, behind the parent's other children.
 */
export function HeroBackground({ level, testID }: { level: SkillLevel; testID?: string }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => setSize(e.nativeEvent.layout);
  const look = levelCard[level];
  const at = gradients.heroAt;
  const stops = [{ offset: 0, color: look.light }, { offset: 0.5, color: look.base }, { offset: 1, color: look.dark }];
  return (
    <View testID={testID} pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {size.width > 0 && (
        <>
          <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id={`hero-${level}`} cx={`${at.x * 100}%`} cy={`${at.y * 100}%`} r="140%">
                {stops.map(stop => <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />)}
              </RadialGradient>
            </Defs>
            <Rect width={size.width} height={size.height} fill={`url(#hero-${level})`} />
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
    </View>
  );
}
