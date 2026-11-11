import { StyleSheet } from 'react-native';
import { colors, radius, shadow } from '@/theme';

/** The 44pt touch target every round header button uses. */
export const CIRCLE_BUTTON_SIZE = 44;

/** A white circle with a soft shadow: back, close and bookmark all share it. */
export const circleButtonStyle = StyleSheet.create({
  circle: {
    width:           CIRCLE_BUTTON_SIZE,
    height:          CIRCLE_BUTTON_SIZE,
    alignItems:      'center',
    justifyContent:  'center',
    borderRadius:    radius.pill,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
}).circle;

/** The design's header button: a white rounded square, ringed, with a solid edge under it (44pt, radius 14). */
export const headerButtonStyle = StyleSheet.create({
  button: {
    width:             CIRCLE_BUTTON_SIZE,
    height:            CIRCLE_BUTTON_SIZE,
    alignItems:        'center',
    justifyContent:    'center',
    borderRadius:      radius.md - 2,
    backgroundColor:   colors.surface,
    borderWidth:       1.5,
    borderColor:       colors.borderSubtle,
    borderBottomWidth: 4.5,
  },
}).button;
