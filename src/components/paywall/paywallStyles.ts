import { StyleSheet } from 'react-native';
import { colors, font, fontSize } from '@/theme';

/** Styles the paywall screen and its parts share. */
export const paywallStyles = StyleSheet.create({
  /** A failed purchase, restore or plan load, under the control it belongs to. */
  errorText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.error,
    textAlign:  'center',
  },
});
