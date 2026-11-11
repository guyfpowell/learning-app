import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, fontSize, radius, spacing } from '@/theme';
import { StepSummary } from '@/components/ui/StepSummary';

type IconName = ComponentProps<typeof Ionicons>['name'];

const ICON_SIZE = 22;

interface SegmentedControlProps<T extends string> {
  /** The visible heading above the segments; also the group's accessible name. */
  label: string;
  /** Segments get `testID` `${testIDPrefix}-${option}`. */
  testIDPrefix: string;
  options: readonly T[];
  labels: Record<T, string>;
  icons: Record<T, IconName>;
  picked: T | null;
  /** Open shows the tiles; closed shows a one-line summary that calls `onOpen` when pressed. */
  open: boolean;
  onOpen: () => void;
  disabled?: boolean;
  /** Called with the tapped option, or `null` when the picked option is tapped again. */
  onPick: (value: T | null) => void;
}

/** The look of one segment: a soft brand tint and border when picked, white with a hairline otherwise. */
export function segmentStyle(selected: boolean, disabled: boolean) {
  return {
    backgroundColor: selected ? colors.brandSoft : colors.surface,
    borderColor: selected ? colors.brand : colors.borderSubtle,
    opacity: disabled ? 0.5 : 1,
  };
}

/** One optional pick from N options in a single row of equal-width segments. */
export function SegmentedControl<T extends string>({
  label,
  testIDPrefix,
  options,
  labels,
  icons,
  picked,
  open,
  onOpen,
  disabled = false,
  onPick,
}: SegmentedControlProps<T>) {
  if (!open) {
    return (
      <StepSummary
        testID={`${testIDPrefix}-summary`}
        label={label}
        value={picked === null ? undefined : labels[picked]}
        disabled={disabled}
        onPress={onOpen}
      />
    );
  }
  return (
    <View accessibilityLabel={label} style={styles.group}>
      <Text style={styles.heading}>{label}</Text>
      <View style={styles.row}>
        {options.map(option => {
          const selected = picked === option;
          return (
            <Pressable
              key={option}
              testID={`${testIDPrefix}-${option}`}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onPick(selected ? null : option)}
              style={[styles.segment, segmentStyle(selected, disabled)]}
            >
              <View testID={`${testIDPrefix}-${option}-icon`}>
                <Ionicons name={icons[option]} size={ICON_SIZE} color={selected ? colors.brand : colors.textSubtle} />
              </View>
              <Text numberOfLines={2} style={[styles.text, selected && styles.textSelected]}>
                {labels[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm3 },
  heading: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.textStrong },
  row: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.sm,
    minHeight: 96,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.card,
  },
  text: { fontFamily: font.medium, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.25, color: colors.textBody, textAlign: 'center' },
  textSelected: { fontFamily: font.semibold, color: colors.textStrong },
});
