import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

/** A very faint line between Home's sections. It carries no meaning, so a screen reader skips it. */
/** `spaceBelow` is for a rule that has no gap after it from its parent. */
export function SectionRule({ spaceBelow = 0 }: { spaceBelow?: number }) {
  return <View testID="section-rule" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.rule, { marginBottom: spaceBelow }]} />;
}

const styles = StyleSheet.create({
  rule: { height: 1, backgroundColor: colors.borderSubtle },
});
