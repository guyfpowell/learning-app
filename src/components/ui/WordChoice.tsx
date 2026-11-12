import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, font, spacing } from '@/theme';

const ROW_HEIGHT = 56;
const UNDERLINE = 3;

interface WordChoiceProps<T extends string> {
  /** The caps heading above the words; also the group's accessible name. */
  label: string;
  /** Each word gets `testID` `${testIDPrefix}-${option}`. */
  testIDPrefix: string;
  options: readonly T[];
  labels: Record<T, string>;
  picked: T | null;
  disabled?: boolean;
  /** Called with the tapped option, or `null` when the picked option is tapped again. */
  onPick: (value: T | null) => void;
}

/** Where a word sits in its row: the first at the left, the last at the right, the rest centred. */
export function wordAlign(index: number, count: number): 'flex-start' | 'center' | 'flex-end' {
  if (index === 0) return 'flex-start';
  return index === count - 1 ? 'flex-end' : 'center';
}

/** One optional pick from N words in a ruled row; the chosen one is cobalt with an underline. */
export function WordChoice<T extends string>({ label, testIDPrefix, options, labels, picked, disabled = false, onPick }: WordChoiceProps<T>) {
  return (
    <View accessibilityLabel={label}>
      <Text style={styles.heading}>{label}</Text>
      <View style={styles.row}>
        {options.map((option, index) => {
          const selected = picked === option;
          return (
            <Pressable
              key={option}
              testID={`${testIDPrefix}-${option}`}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onPick(selected ? null : option)}
              style={[styles.word, { alignItems: wordAlign(index, options.length) }]}
            >
              <Text style={[styles.text, selected && styles.textSelected]}>{labels[option]}</Text>
              {selected && <View testID={`${testIDPrefix}-${option}-underline`} style={styles.underline} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    paddingBottom:  spacing.xs,
    fontFamily:     font.extrabold,
    fontSize:       12,
    letterSpacing:  0.08 * 12,
    textTransform:  'uppercase',
    color:          colors.textMuted,
  },
  row: {
    flexDirection:     'row',
    borderTopWidth:    1,
    borderBottomWidth: 1,
    borderColor:       colors.border,
  },
  word: {
    flex:           1,
    height:         ROW_HEIGHT,
    justifyContent: 'center',
  },
  text:         { fontFamily: font.bold, fontSize: 18, color: colors.textSubtle },
  textSelected: { fontFamily: font.extrabold, color: colors.brand },
  underline: {
    position:        'absolute',
    start:           0,
    end:             0,
    bottom:          0,
    height:          UNDERLINE,
    backgroundColor: colors.brand,
  },
});
