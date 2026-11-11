import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/components/ui/Icon';
import { font, fontSize, press, radius, spacing } from '@/theme';

const FACE_HEIGHT = 56;
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
 */
export function EdgeButton({ look, label, icon, onPress, testID, accessibilityLabel }: {
  look: EdgeLook;
  label: string;
  icon: IconName;
  onPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const [pressed, setPressed] = useState(false);
  const lift = press.edge - press.edgePressed;
  return (
    <View style={[styles.edge, { backgroundColor: look.edge, paddingBottom: pressed ? press.edgePressed : press.edge }]}>
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        style={[styles.face, { backgroundColor: look.face }, pressed && { transform: [{ translateY: lift }] }]}
      >
        <Text style={[styles.label, { color: look.label }]}>{label}</Text>
        <Icon name={icon} size={fontSize.md} color={look.label} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  edge:  { borderRadius: radius.md },
  face:  { height: FACE_HEIGHT, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  label: { fontFamily: font.cta, fontSize: fontSize.md - 1, letterSpacing: LABEL_TRACKING },
});
