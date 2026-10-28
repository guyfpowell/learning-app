import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, fontSize, radius, shadow, spacing } from '@/theme';
import { StepSummary } from '@/components/ui/StepSummary';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** The hue of one segment: what its icon circle, picked fill and picked border use. */
export type SegmentTone = 'amber' | 'success' | 'coral' | 'brand' | 'violet' | 'neutral';

const TONE_COLOURS = {
  amber: { soft: colors.xpSoft, strong: colors.xp },
  success: { soft: colors.successSoft, strong: colors.success },
  coral: { soft: colors.coralSoft, strong: colors.coral },
  brand: { soft: colors.brandSoft, strong: colors.brand },
  violet: { soft: colors.expertSoft, strong: colors.expert },
  neutral: { soft: colors.surfaceSunken, strong: colors.textMuted },
} satisfies Record<SegmentTone, { soft: string; strong: string }>;

const ICON_SIZE = 18;

interface SegmentedControlProps<T extends string> {
  /** The visible heading above the segments; also the group's accessible name. */
  label: string;
  /** Segments get `testID` `${testIDPrefix}-${option}`. */
  testIDPrefix: string;
  options: readonly T[];
  labels: Record<T, string>;
  icons: Record<T, IconName>;
  tones: Record<T, SegmentTone>;
  picked: T | null;
  /** Open shows the tiles; closed shows a one-line summary that calls `onOpen` when pressed. */
  open: boolean;
  onOpen: () => void;
  disabled?: boolean;
  /** Called with the tapped option, or `null` when the picked option is tapped again. */
  onPick: (value: T | null) => void;
}

/** The look of one segment. Exported so tests can check the style without `toHaveStyle`. */
export function segmentStyle(tone: SegmentTone, selected: boolean, disabled: boolean) {
  return {
    backgroundColor: selected ? TONE_COLOURS[tone].soft : colors.surface,
    borderColor: selected ? TONE_COLOURS[tone].strong : colors.borderSubtle,
    opacity: disabled ? 0.5 : 1,
  };
}

/** The circle behind a segment's icon: the soft tint, or the strong colour when picked. */
export function iconCircleStyle(tone: SegmentTone, selected: boolean) {
  return { backgroundColor: selected ? TONE_COLOURS[tone].strong : TONE_COLOURS[tone].soft };
}

/** One optional pick from N options in a single row of equal-width segments. */
export function SegmentedControl<T extends string>({
  label,
  testIDPrefix,
  options,
  labels,
  icons,
  tones,
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
          const tone = tones[option];
          return (
            <Pressable
              key={option}
              testID={`${testIDPrefix}-${option}`}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onPick(selected ? null : option)}
              style={[styles.segment, shadow.xs, segmentStyle(tone, selected, disabled)]}
            >
              <View testID={`${testIDPrefix}-${option}-icon`} style={[styles.iconCircle, iconCircleStyle(tone, selected)]}>
                <Ionicons name={icons[option]} size={ICON_SIZE} color={selected ? colors.onBrand : TONE_COLOURS[tone].strong} />
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
  group: { gap: spacing.xs },
  heading: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.textStrong },
  row: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm3,
    borderWidth: 1.5,
    borderRadius: radius.md,
  },
  iconCircle: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  text: { fontFamily: font.medium, fontSize: fontSize.xs, color: colors.textStrong, textAlign: 'center' },
  textSelected: { fontFamily: font.bold },
});
