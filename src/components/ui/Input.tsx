import React, { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, font, radius } from '@/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

const FIELD_HEIGHT = 52;

/** A labelled field: white, a 1.5pt ring at rest, a 2pt cobalt ring while it has focus, red when it has an error. */
export function Input({ label, error, style, onFocus, onBlur, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, focused && styles.inputFocused, error && styles.inputError, style as object]}
        placeholderTextColor={colors.textSubtle}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        {...rest}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 7 },
  label:   { fontFamily: font.bold, fontSize: 13, color: colors.textBody },
  input: {
    height:            FIELD_HEIGHT,
    fontFamily:        font.medium,
    fontSize:          16,
    color:             colors.textStrong,
    backgroundColor:   colors.surface,
    borderWidth:       1.5,
    borderColor:       colors.border,
    borderRadius:      radius.md,
    paddingHorizontal: 16,
  },
  inputFocused: { borderWidth: 2, borderColor: colors.brand },
  inputError:   { borderWidth: 2, borderColor: colors.error },
  error:        { fontFamily: font.regular, fontSize: 12, color: colors.error },
});
