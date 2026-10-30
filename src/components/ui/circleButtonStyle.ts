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
