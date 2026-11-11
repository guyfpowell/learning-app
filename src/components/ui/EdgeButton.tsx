import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/components/ui/Icon';
import { font, fontSize, press, radius, spacing } from '@/theme';

const FACE_HEIGHT = 56;
const COMPACT_FACE_HEIGHT = 44;
const LABEL_TRACKING = -0.01 * fontSize.md;

/** What a button looks like: its face, its label and the solid edge under it. */
export interface EdgeLook {
  face: string;
  label: string;
  edge: string;
}

/**
 * A pressable with a solid bottom edge that collapses when held (the design's depth).
 * The caller picks the colours, so it sits on any surface: white on cobalt, ink on sand.
 * `disabled` draws it flat, in the `disabledLook`; `loading` swaps the label for a spinner.
 */
export function EdgeButton({ look, disabledLook, label, icon, onPress, disabled = false, loading = false, compact = false, testID, accessibilityLabel }: {
  look: EdgeLook;
  /** What it looks like when disabled: flat, with no edge. */
  disabledLook?: Pick<EdgeLook, 'face' | 'label'>;
  label: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** A shorter face and smaller label, for a button that sits beside text in a row. */
  compact?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const [pressed, setPressed] = useState(false);
  const lift = press.edge - press.edgePressed;
  const flat = disabled && disabledLook !== undefined;
  const face = flat ? disabledLook.face : look.face;
  const labelColor = flat ? disabledLook.label : look.label;
  const edgeHeight = pressed ? press.edgePressed : press.edge;
  return (
    <View style={[styles.edge, { backgroundColor: look.edge, paddingBottom: flat ? 0 : edgeHeight }, flat && styles.flat]}>
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: disabled || loading }}
        style={[styles.face, compact && styles.compactFace, { backgroundColor: face }, pressed && !disabled && { transform: [{ translateY: lift }] }]}
      >
        {loading ? (
          <ActivityIndicator color={labelColor} />
        ) : (
          <>
            <Text style={[styles.label, compact && styles.compactLabel, { color: labelColor }]}>{label}</Text>
            {icon !== undefined && <Icon name={icon} size={fontSize.md} color={labelColor} strokeWidth={2.4} />}
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  edge:  { borderRadius: radius.md },
  flat:  { backgroundColor: 'transparent' },
  face:  { height: FACE_HEIGHT, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  compactFace:  { height: COMPACT_FACE_HEIGHT, paddingHorizontal: spacing.md },
  compactLabel: { fontSize: fontSize.base },
  label: { fontFamily: font.cta, fontSize: fontSize.md - 1, letterSpacing: LABEL_TRACKING },
});
