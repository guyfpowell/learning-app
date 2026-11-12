import { Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, font, fontSize, radius, spacing } from '@/theme';

/** The page's quiet button: no fill, a 1.5pt ring in the strong rule colour (Albert, option A). */
export function RuleButton({ label, onPress, height = 46, disabled = false, testID }: {
  label: string;
  onPress: () => void;
  height?: number;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.button, { height }, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button:   { borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  pressed:  { backgroundColor: colors.surfaceSunken },
  disabled: { opacity: 0.5 },
  label:    { fontFamily: font.extrabold, fontSize: fontSize.md - 1, letterSpacing: -0.01 * fontSize.md, color: colors.textStrong },
});
