import type { Edge } from 'react-native-safe-area-context';

/**
 * The safe-area edges a tab screen applies. The `(tabs)` layout owns the top inset (the verification
 * banner) and the tab bar owns the bottom one, so a screen adding `bottom` leaves a blank band above the bar.
 */
export const TAB_SCREEN_EDGES: readonly Edge[] = ['left', 'right'];
