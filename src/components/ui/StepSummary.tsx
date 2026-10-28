import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, fontSize, spacing } from '@/theme';

interface StepSummaryProps {
  testID: string;
  /** The step's heading. */
  label: string;
  /** What was answered, in one muted line. Absent when nothing was. */
  value?: string;
  /** Opens the step. */
  onPress: () => void;
  disabled?: boolean;
}

/** A collapsed step: its heading, its answer if any, and a chevron. Pressing it opens the step. */
export function StepSummary({ testID, label, value, onPress, disabled = false }: StepSummaryProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: false, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.row}
    >
      <Text numberOfLines={1} style={styles.label}>{label}</Text>
      {value !== undefined && <Text testID={`${testID}-value`} numberOfLines={1} style={styles.value}>{value}</Text>}
      <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  label: { flexShrink: 1, fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.textStrong },
  value: { flex: 1, textAlign: 'right', fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
});
