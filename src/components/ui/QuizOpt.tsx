/**
 * QuizOpt — quiz option button — ticket 069 A3.
 *
 * Maps .asc-quizopt (__key, __mark, data-state) from the design system.
 * Used in QuizModal (A4) for both question-time selection and the result
 * feedback blocks. States:
 *   idle      — default, pressable
 *   selected  — user tapped it, waiting for submit (not in current quiz flow
 *               but included so the primitive is complete)
 *   correct   — right answer (green)
 *   incorrect — wrong answer (red)
 *
 * After answering (correct / incorrect) the button is not pressable.
 */
import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, font, fontSize, radius, shadow, spacing } from '@/theme';

export type QuizOptState = 'idle' | 'selected' | 'correct' | 'incorrect';

interface QuizOptProps extends Omit<PressableProps, 'children' | 'style'> {
  optKey: string;   // A, B, C, D
  label: string;
  state?: QuizOptState;
  style?: StyleProp<ViewStyle>;
}

export function QuizOpt({
  optKey,
  label,
  state = 'idle',
  onPress,
  testID,
  style,
  ...rest
}: QuizOptProps) {
  const isAnswered = state === 'correct' || state === 'incorrect';

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isAnswered}
      accessibilityState={{ selected: state === 'selected' }}
      style={({ pressed }) => [
        quizOptTileStyle(state),
        pressed && !isAnswered && styles.optPressed,
        style,
      ]}
      {...rest}
    >
      {/* Key letter */}
      <View style={[styles.key, quizOptKeyStyle(state)]}>
        <Text style={[styles.keyText, quizOptKeyTextStyle(state)]}>{optKey}</Text>
      </View>

      {/* Option text */}
      <Text style={[styles.label, state !== 'idle' && styles.labelAnswered]}>
        {label}
      </Text>

      {/* Mark icon — only shown after answering */}
      {isAnswered && (
        <View style={styles.mark}>
          <Feather
            name={state === 'correct' ? 'check' : 'x'}
            size={18}
            color={state === 'correct' ? colors.success : colors.error}
          />
        </View>
      )}
    </Pressable>
  );
}

// ── Per-state styles ─────────────────────────────────────────────────────────

function stateStyle(s: QuizOptState) {
  switch (s) {
    case 'selected':  return styles.optSelected;
    case 'correct':   return styles.optCorrect;
    case 'incorrect': return styles.optIncorrect;
    default:          return null;
  }
}

/** The tile's resolved style for a state (exported: `toHaveStyle` is not installed). */
export function quizOptTileStyle(s: QuizOptState) {
  return StyleSheet.flatten([styles.opt, stateStyle(s)]);
}

export function quizOptKeyStyle(s: QuizOptState) {
  switch (s) {
    case 'correct':   return styles.keyCorrect;
    case 'incorrect': return styles.keyIncorrect;
    case 'selected':  return styles.keySelected;
    default:          return null;
  }
}

export function quizOptKeyTextStyle(s: QuizOptState) {
  switch (s) {
    case 'correct':
    case 'incorrect':
    case 'selected':  return styles.keyTextOnColor;
    default:          return null;
  }
}

// ── StyleSheet ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  opt: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    gap:            spacing.sm,
    padding:        spacing.sm3,
    borderRadius:   radius.md,
    borderWidth:    1.5,
    borderColor:    colors.borderSubtle,
    backgroundColor: colors.surface,
    ...shadow.xs,
  },
  optPressed: {
    backgroundColor: colors.surfaceSunken,
  },
  optSelected: {
    borderColor:     colors.brand,
    backgroundColor: colors.brandSoft,
  },
  optCorrect: {
    borderColor:     colors.success,
    backgroundColor: colors.successSoft,
  },
  optIncorrect: {
    borderColor:     colors.error,
    backgroundColor: colors.errorSoft,
  },

  // ── Key circle ───────────────────────────────────────────────────────────
  key: {
    width:          32,
    height:         32,
    borderRadius:   radius.pill,
    borderWidth:    1.5,
    borderColor:    colors.border,
    backgroundColor: colors.surfaceSunken,
    alignItems:     'center',
    justifyContent: 'center',
    flex:           0,
  },
  keySelected: {
    borderColor:     colors.brand,
    backgroundColor: colors.brand,
  },
  keyCorrect: {
    borderColor:     colors.success,
    backgroundColor: colors.success,
  },
  keyIncorrect: {
    borderColor:     colors.error,
    backgroundColor: colors.error,
  },
  keyText: {
    fontFamily: font.bold,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  keyTextOnColor: {
    color: colors.onBrand,
  },

  // ── Option label ─────────────────────────────────────────────────────────
  label: {
    flex:       1,
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textBody,
  },
  labelAnswered: {
    fontFamily: font.medium,
  },

  // ── Check / cross mark ───────────────────────────────────────────────────
  mark: {
    width:          26,
    height:         26,
    alignItems:     'center',
    justifyContent: 'center',
    flex:           0,
  },
});
