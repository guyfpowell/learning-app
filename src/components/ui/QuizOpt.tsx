/**
 * QuizOpt: a quiz answer tile. A white tile with a solid edge and a radio mark on the right.
 * States:
 *   idle     — pressable
 *   selected — picked, waiting for submit: cobalt, with a white tick
 *   ruledOut — the wrong first pick on the second try: struck through and not pressable
 */
import React from 'react';
import { Pressable, PressableProps, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { colors, font, fontSize, press, radius, spacing } from '@/theme';

export type QuizOptState = 'idle' | 'selected' | 'ruledOut';

interface QuizOptProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  state?: QuizOptState;
  style?: StyleProp<ViewStyle>;
}

const TILE_MIN_HEIGHT = 60;
const MARK_SIZE = 26;
const MARK_RING = 2;
const TICK_SIZE = 14;
/** The tile's ring, and the solid edge under it. */
const RING = 1.5;
const EDGE = RING + press.edge / 2 + 1;

export function QuizOpt({ label, state = 'idle', onPress, testID, style, ...rest }: QuizOptProps) {
  const ruledOut = state === 'ruledOut';
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={ruledOut}
      accessibilityRole="button"
      accessibilityState={{ selected: state === 'selected', disabled: ruledOut }}
      style={[quizOptTileStyle(state), style]}
      {...rest}
    >
      <Text style={[styles.label, state === 'selected' && styles.labelSelected, ruledOut && styles.labelRuledOut]}>{label}</Text>
      {!ruledOut && (
        <View style={[styles.mark, state === 'selected' && styles.markSelected]}>
          {state === 'selected' && <Icon name="check" size={TICK_SIZE} color={colors.brand} strokeWidth={3.2} />}
        </View>
      )}
    </Pressable>
  );
}

function stateStyle(s: QuizOptState) {
  switch (s) {
    case 'selected': return styles.optSelected;
    case 'ruledOut': return styles.optRuledOut;
    default:         return null;
  }
}

/** The tile's resolved style for a state (exported: `toHaveStyle` is not installed). */
export function quizOptTileStyle(s: QuizOptState) {
  return StyleSheet.flatten([styles.opt, stateStyle(s)]);
}

const styles = StyleSheet.create({
  opt: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm3,
    minHeight:         TILE_MIN_HEIGHT,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm3,
    borderRadius:      radius.md,
    borderWidth:       RING,
    borderBottomWidth: EDGE,
    borderColor:       colors.borderSubtle,
    borderBottomColor: colors.border,
    backgroundColor:   colors.surface,
  },
  optSelected: {
    borderColor:       colors.brand,
    borderBottomColor: press.primaryEdge,
    backgroundColor:   colors.brand,
  },
  optRuledOut: {
    borderBottomWidth: RING,
    borderBottomColor: colors.borderSubtle,
    backgroundColor:   colors.surfaceSunken,
  },
  label: {
    flex:       1,
    fontFamily: font.semibold,
    fontSize:   fontSize.md,
    lineHeight: fontSize.md * 1.25,
    color:      colors.textStrong,
  },
  labelSelected: { fontFamily: font.bold, color: colors.white },
  labelRuledOut: { fontFamily: font.medium, color: colors.textSubtle, textDecorationLine: 'line-through' },
  mark: {
    width:          MARK_SIZE,
    height:         MARK_SIZE,
    borderRadius:   MARK_SIZE / 2,
    borderWidth:    MARK_RING,
    borderColor:    colors.border,
    alignItems:     'center',
    justifyContent: 'center',
  },
  markSelected: { borderColor: colors.white, backgroundColor: colors.white },
});
