import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, font, spacing } from '@/theme';

/** A row's text-only action: "Enrol", "Upgrade" or "Ask Albert". A loading one shows a spinner. */
export function TextAction({ label, icon, color = colors.textLink, loading = false, onPress, testID }: {
  label: string;
  /** Sits before the label (the lock on Upgrade). */
  icon?: ReactNode;
  color?: string;
  loading?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: loading }}
      hitSlop={spacing.sm}
      style={styles.action}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label:  { fontFamily: font.extrabold, fontSize: 15 },
});
