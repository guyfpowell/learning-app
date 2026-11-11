import { StyleSheet } from 'react-native';
import { colors, font } from '@/theme';

/** The settings list's row: a rule above it (the first has none), 13pt of space, 16pt semibold text. */
export const settingsRow = StyleSheet.create({
  row: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    paddingVertical: 13,
    borderTopWidth:  1,
    borderTopColor:  colors.border,
  },
  first: { borderTopWidth: 0 },
  label: {
    flex:       1,
    fontFamily: font.semibold,
    fontSize:   16,
    color:      colors.textStrong,
  },
});

/** The grey chevron at the end of a row that opens something. */
export const CHEVRON_SIZE = 18;
